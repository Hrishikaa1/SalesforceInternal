import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import getLeadById from '@salesforce/apex/GuestLeadController.getLeadById';
import updateLead from '@salesforce/apex/GuestLeadController.updateLead';
import createLead from '@salesforce/apex/GuestLeadController.createLead';

export default class EditLeadModal extends LightningModal {
    @api recordId;
    @track leadRecord = {};

    connectedCallback() {
        if (this.recordId) {
            getLeadById({ leadId: this.recordId })
                .then(result => { this.leadRecord = { ...result }; })
                .catch(error => { console.error(error); });
        }
    }

    handleChange(event) {
        this.leadRecord[event.target.name] = event.target.value;
    }

    async handleSave() {
        const method = this.recordId ? updateLead : createLead;
        try {
            await method({
                leadId: this.recordId,
                leadData: this.leadRecord
            });
            this.close('refresh');
        } catch (error) {
            console.error(error);
            this.close('error');
        }
    }

    handleCancel() {
        this.close();
    }
}
