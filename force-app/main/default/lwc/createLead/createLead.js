import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getLeadById from '@salesforce/apex/GuestLeadController.getLeadById';
import getLeadPicklistValues from '@salesforce/apex/GuestLeadController.getLeadPicklistValues';
import createLead from '@salesforce/apex/GuestLeadController.createLead';
import updateLead from '@salesforce/apex/GuestLeadController.updateLead';

export default class CreateLead extends LightningElement {
    @api recordId;
    @api isViewMode = false;
    @track isLoading = false;
    @track picklistOptions = {};
    @track leadRecord = {};

    connectedCallback() {
        this.loadPicklistValues();
        if (this.recordId) this.loadLead();
    }

    async loadPicklistValues() {
        try {
            const data = await getLeadPicklistValues();
            this.picklistOptions = {};
            Object.keys(data).forEach(field => {
                this.picklistOptions[field] = data[field].map(val => ({ label: val, value: val }));
            });
        } catch {
            this.showToast('Error', 'Failed to load picklist values', 'error');
        }
    }

    async loadLead() {
        this.isLoading = true;
        try {
            const data = await getLeadById({ leadId: this.recordId });
            this.leadRecord = { ...data };
        } catch (e) {
            this.showToast('Error', e.body?.message || e.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this.leadRecord[field] = event.detail.value;
    }

    async handleSave() {
        const required = ['LastName', 'Company', 'Channel__c', 'Geography__c', 'Business_Type__c'];
        for (const f of required) {
            if (!this.leadRecord[f]) {
                this.showToast('Error', 'Please fill all required fields.', 'error');
                return;
            }
        }
        this.isLoading = true;
        try {
            if (this.recordId) {
                await updateLead({ leadId: this.recordId, leadData: this.leadRecord });
                this.showToast('Success', 'Lead updated successfully', 'success');
            } else {
                await createLead({ leadData: this.leadRecord });
                this.showToast('Success', 'Lead created successfully', 'success');
            }
            this.dispatchEvent(new CustomEvent('refresh'));
            this.handleCancel();
        } catch (e) {
            this.showToast('Error', e.body?.message || e.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    get formTitle() {
        if (this.isViewMode) return 'View Lead';
        return this.recordId ? 'Edit Lead' : 'Create Lead';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}