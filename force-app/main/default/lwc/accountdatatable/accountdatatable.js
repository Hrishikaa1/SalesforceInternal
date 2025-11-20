import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getLeads from '@salesforce/apex/GuestLeadController.getLeads';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class Accountdatatable extends NavigationMixin(LightningElement) {
    @track leads = [];
    @track isModalOpen = false;
    @track selectedLeadId = null;
    @track isViewMode = false;
    wiredLeadsResult;

    @wire(getLeads)
    wiredLeads(result) {
        this.wiredLeadsResult = result;
        if (result.data) {
            this.leads = result.data.map((lead, index) => ({
                ...lead,
                rowNumber: index + 1
            }));
        } else if (result.error) {
            this.showToast('Error', 'Failed to load leads', 'error');
        }
    }

    handleEditClick(event) {
        const leadId = event.target.dataset.id;
        this.selectedLeadId = leadId;
        this.isViewMode = false;
        this.isModalOpen = true;
    }

    handleViewClick(event) {
        const leadId = event.target.dataset.id;
        this.selectedLeadId = leadId;
        this.isViewMode = true;
        this.isModalOpen = true;
    }

    handleCreateLead() {
        this.selectedLeadId = null;
        this.isViewMode = false;
        this.isModalOpen = true;
    }

    handleModalClose() {
        this.isModalOpen = false;
        this.selectedLeadId = null;
        this.isViewMode = false;
    }

    refreshData() {
        refreshApex(this.wiredLeadsResult);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}