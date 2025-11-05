import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createContact from '@salesforce/apex/GuestContactController.createContact';
import updateContact from '@salesforce/apex/GuestContactController.updateContact';
import getContactById from '@salesforce/apex/GuestContactController.getContactById';

export default class CreateContacts extends LightningModal {
    @api recordId; // contactId for edit

    @track isLoading = false;

    @track contactRecord = {
        LastName: '',
        Email: '',
        Phone: '',
        MobilePhone: '',
        Contact_type__c: '',
        AccountId: ''
    };

    connectedCallback() {
        if (this.recordId) {
            this.loadContact();
        }
    }

    async loadContact() {
        this.isLoading = true;
        try {
            const rec = await getContactById({ contactId: this.recordId });
            // Normalize to our local shape
            this.contactRecord = {
                LastName: rec.LastName || '',
                Email: rec.Email || '',
                Phone: rec.Phone || '',
                MobilePhone: rec.MobilePhone || '',
                Contact_type__c: rec.Contact_type__c || '',
                AccountId: rec.AccountId || ''
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
        if (!this.contactRecord.LastName) {
            this.toast('Error', 'Last Name is required', 'error');
            return;
        }

        this.isLoading = true;
        try {
            if (this.recordId) {
                // Edit existing
                await updateContact({
                    contactId: this.recordId,
                    contactData: this.contactRecord
                });
                this.toast('Success', 'Contact updated', 'success');
            } else {
                // Create new (always insert a fresh record)
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
        return this.recordId ? 'Edit Contact' : 'Create New Contact';
    }
}
