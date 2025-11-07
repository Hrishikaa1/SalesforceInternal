import { LightningElement, wire, track } from 'lwc';
import getOpportunities from '@salesforce/apex/GuestOpportunityController.getOpportunities';
import CreateEditOpportunityModal from 'c/createOpportunity';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class Opportunitydatatable extends LightningElement {

    @track opportunities = [];
    @track error;
    @track selectedRows = [];
    wiredOpportunitiesResult;

    columns = [
        { label: 'Opportunity Name', fieldName: 'Name', type: 'text' },
        { label: 'Account Name', fieldName: 'AccountName', type: 'text' },
        { label: 'FY Goals', fieldName: 'FYGoalsName', type: 'text' },
        { label: 'Type', fieldName: 'Type', type: 'text' },
        { label: 'Opportunity Type', fieldName: 'Opportunity_Type__c', type: 'text' },
        { label: 'Channel', fieldName: 'Channel__c', type: 'text' }
    ];

    @wire(getOpportunities)
    wiredOpportunities(result) {
        this.wiredOpportunitiesResult = result;

        if (result.data) {
            // Normalize relationship fields for readable UI display
            this.opportunities = result.data.map(opp => ({
                ...opp,
                AccountName: opp?.Account?.Name,
                FYGoalsName: opp?.FY_Goals__r?.Name
            }));
            this.error = undefined;
        } else if (result.error) {
            this.opportunities = [];
            this.error = result.error.body?.message || 'Unexpected issue encountered';
        }
    }

    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
    }

    async handleCreateOpportunity() {
        const result = await CreateEditOpportunityModal.open({ size: 'medium' });

        if (result === 'refresh') {
            this.refreshData();
        }
    }

    async handleEditOpportunity() {
        if (!this.selectedRows.length) {
            return this.showToast('Notice', 'Select one record to edit.', 'warning');
        }

        if (this.selectedRows.length > 1) {
            return this.showToast('Warning', 'Select only one record.', 'warning');
        }

        const result = await CreateEditOpportunityModal.open({
            size: 'medium',
            recordId: this.selectedRows[0].Id
        });

        if (result === 'refresh') {
            this.refreshData();
        }
    }

    refreshData() {
        this.selectedRows = [];
        return refreshApex(this.wiredOpportunitiesResult)
            .then(() => this.showToast('Success', 'Information updated.', 'success'))
            .catch(() => this.showToast('Error', 'Could not refresh data.', 'error'));
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get isEditDisabled() {
        return this.selectedRows.length !== 1;
    }
}
