import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createLead from '@salesforce/apex/GuestLeadController.createLead';
import updateLead from '@salesforce/apex/GuestLeadController.updateLead';
import getLeadById from '@salesforce/apex/GuestLeadController.getLeadById';

export default class CreateLead extends LightningModal {
    @api recordId;

    @track leadRecord = {
        LastName: '',
        Company: '',
        Email: '',
        Phone: '',
        Status: 'Open - Not Contacted',
        Title: '',
        Channel__c: '',
        Geography__c: '',
        Direct_Indirect__c: '',
        Business_Type__c: '',
        Contact_type__c: '',
        Rating: ''
    };

    @track isLoading = false;

    statusOptions = [
        { label: 'Open - Not Contacted', value: 'Open - Not Contacted' },
        { label: 'Working - Contacted', value: 'Working - Contacted' },
        { label: 'Closed - Converted', value: 'Closed - Converted' },
        { label: 'Closed - Not Converted', value: 'Closed - Not Converted' }
    ];

    ratingOptions = [
        { label: 'Hot', value: 'Hot' },
        { label: 'Warm', value: 'Warm' },
        { label: 'Cold', value: 'Cold' }
    ];

    connectedCallback() {
        if (this.recordId) this.loadLead();
    }

    async loadLead() {
        this.isLoading = true;
        try {
            const data = await getLeadById({ leadId: this.recordId });
            this.leadRecord = { ...data };
        } catch (e) {
            this.showToast('Error', e.body?.message || e.message, 'error');
            this.close();
        } finally {
            this.isLoading = false;
        }
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this.leadRecord[field] = event.target.value;
    }

    async handleSave() {
        if (!this.leadRecord.LastName || !this.leadRecord.Company) {
            this.showToast('Error','Last Name and Company are required','error');
            return;
        }

        this.isLoading = true;
        try {
            if (this.recordId) {
                await updateLead({ leadId: this.recordId, leadData: this.leadRecord });
                this.showToast('Success','Lead updated','success');
            } else {
                await createLead({ leadData: this.leadRecord });
                this.showToast('Success','Lead created','success');
            }
            this.close('refresh');
        } catch (e) {
            this.showToast('Error', e.body?.message || e.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleCancel() {
        this.close();
    }

    showToast(t, m, v) {
        this.dispatchEvent(new ShowToastEvent({ title:t, message:m, variant:v }));
    }

    get modalTitle() {
        return this.recordId ? 'Edit Lead' : 'Create New Lead';
    }
}