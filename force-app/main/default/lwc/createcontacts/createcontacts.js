import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createContact from '@salesforce/apex/GuestContactController.createContact';
import updateContact from '@salesforce/apex/GuestContactController.updateContact';
import getContactById from '@salesforce/apex/GuestContactController.getContactById';
import getContactPicklistValues from '@salesforce/apex/GuestContactController.getContactPicklistValues';
import getAccounts from '@salesforce/apex/GuestContactController.getAccounts';

export default class CreateContacts extends LightningModal {
    @api recordId;
    @api isViewMode = false;
    @track isLoading = false;
    @track contactTypeOptions = [];
    @track submittedByOptions = [];
    @track accountOptions = [];
    @track contactRecord = {
        AccountId: '',
        LastName: '',
        Email: '',
        Phone: '',
        MobilePhone: '',
        Contact_type__c: '',
        Submitted_by__c: ''
    };

    async connectedCallback() {
        await this.loadPicklistValues();
        
        if (this.recordId) {
            this.loadContact();
        }

        // Load accounts
        try {
            const accounts = await getAccounts({ searchTerm: '' });
            this.accountOptions = accounts;
        } catch (e) {
            console.error('Error loading accounts:', e);
        }
    }

    async loadPicklistValues() {
        try {
            const picklistData = await getContactPicklistValues();
            
            if (picklistData && picklistData.Contact_type__c) {
                this.contactTypeOptions = picklistData.Contact_type__c.map(val => ({
                    label: val,
                    value: val
                }));
            }

            if (picklistData && picklistData.Submitted_by__c) {
                this.submittedByOptions = picklistData.Submitted_by__c.map(val => ({
                    label: val,
                    value: val
                }));
            }
        } catch (e) {
            console.error('Error loading picklist values:', e);
        }
    }

    async loadContact() {
        this.isLoading = true;
        try {
            const rec = await getContactById({ contactId: this.recordId });
            this.contactRecord = {
                AccountId: rec.AccountId || '',
                LastName: rec.LastName || '',
                Email: rec.Email || '',
                Phone: rec.Phone || '',
                MobilePhone: rec.MobilePhone || '',
                Contact_type__c: rec.Contact_type__c || '',
                Submitted_by__c: rec.Submitted_by__c || ''
            };
        } catch (e) {
            this.toast('Error', e.body?.message || e.message, 'error');
            this.close();
        } finally {
            this.isLoading = false;
        }
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this.contactRecord[field] = event.target.value;
    }

    async handleSave() {
        if (!this.contactRecord.LastName || !this.contactRecord.AccountId || !this.contactRecord.Contact_type__c || !this.contactRecord.Submitted_by__c) {
            this.toast('Error', 'Please fill all required fields', 'error');
            return;
        }

        this.isLoading = true;
        try {
            if (this.recordId) {
                await updateContact({
                    contactId: this.recordId,
                    contactData: this.contactRecord
                });
                this.toast('Success', 'Contact updated', 'success');
            } else {
                await createContact({
                    contactData: this.contactRecord
                });
                this.toast('Success', 'Contact created', 'success');
            }
            this.close('refresh');
        } catch (e) {
            this.toast('Error', e.body?.message || e.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleCancel() {
        this.close();
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get modalTitle() {
        if (this.isViewMode) return 'View Contact';
        return this.recordId ? 'Edit Contact' : 'Create New Contact';
    }
}