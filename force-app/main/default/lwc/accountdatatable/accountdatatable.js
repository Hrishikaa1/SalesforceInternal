import { LightningElement, wire, track } from 'lwc';
import getLeads from '@salesforce/apex/AccountDatatableCls.getLeads';
import CreateEditLeadModal from 'c/createLead';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class AccountDatatable extends LightningElement {
    @track leads = [];
    @track error;
    @track selectedRows = [];
    wiredLeadsResult;

    columns = [
        { label: 'Lead ID',   fieldName: 'Id',      type: 'text' },
        { label: 'Last Name', fieldName: 'LastName',type: 'text' },
        { label: 'Company',   fieldName: 'Company', type: 'text' },
        { label: 'Phone',     fieldName: 'Phone',   type: 'phone'},
        { label: 'Email',     fieldName: 'Email',   type: 'email'},
        { label: 'Status',    fieldName: 'Status',  type: 'text' },
        { label: 'Rating',    fieldName: 'Rating',  type: 'text' }
    ];

    @wire(getLeads)
    wiredLeads(result) {
        this.wiredLeadsResult = result;
        if (result.data) {
            this.leads = [...result.data];
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error.body?.message || 'Unknown error';
            this.leads = [];
        }
    }

    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
    }

    async handleCreateLead() {
        const result = await CreateEditLeadModal.open({ size: 'medium' });
        if (result === 'refresh') this.refreshData();
    }

    async handleEditLead() {
        if (!this.selectedRows.length) {
            this.showToast('Warning','Select one lead','warning');
            return;
        }
        if (this.selectedRows.length > 1) {
            this.showToast('Warning','Select only one lead','warning');
            return;
        }
        const result = await CreateEditLeadModal.open({
            size: 'medium',
            recordId: this.selectedRows[0].Id
        });
        if (result === 'refresh') this.refreshData();
    }

    refreshData() {
        this.selectedRows = [];
        return refreshApex(this.wiredLeadsResult)
            .then(() => this.showToast('Success','Refreshed','success'))
            .catch(() => this.showToast('Error','Refresh failed','error'));
    }

    showToast(t, m, v) {
        this.dispatchEvent(new ShowToastEvent({ title:t, message:m, variant:v }));
    }

    get isEditDisabled() {
        return this.selectedRows.length !== 1;
    }
}