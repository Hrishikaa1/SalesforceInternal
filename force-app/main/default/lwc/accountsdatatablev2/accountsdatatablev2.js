import { LightningElement, wire, track } from 'lwc';
import getAccounts from '@salesforce/apex/GuestAccountController.getAccounts';
import CreateEditAccountModal from 'c/createAccounts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class Accountsdatatablev2 extends LightningElement {
    @track accounts = [];
    @track error;
    @track selectedRows = [];
    wiredAccountsResult;

    columns = [
        { label: 'Name', fieldName: 'Name', type: 'text' },
        { label: 'Overall Rating', fieldName: 'Overall_Rating__c', type: 'text' },
        { label: 'Website', fieldName: 'Website', type: 'url', typeAttributes: { target: '_blank' } },
        { label: 'Fax', fieldName: 'Fax', type: 'phone' },
        { label: 'Phone', fieldName: 'Phone', type: 'phone' },
        { label: 'Direct/Indirect', fieldName: 'Direct_Indirect__c', type: 'text' }
    ];

    @wire(getAccounts)
    wiredAccounts(result) {
        this.wiredAccountsResult = result;
        if (result.data) {
            this.accounts = [...result.data];
            this.error = undefined;
        } else if (result.error) {
            this.accounts = [];
            this.error = result.error?.body?.message || 'Unknown error';
        }
    }

    handleRowSelection(e) {
        this.selectedRows = e.detail.selectedRows || [];
    }

    async handleCreateAccount() {
        const result = await CreateEditAccountModal.open({ size: 'medium' });
        if (result === 'refresh') this.refreshData();
    }

    async handleEditAccount() {
        if (!this.selectedRows.length) {
            return this.showToast('Warning', 'Select one Account', 'warning');
        }
        if (this.selectedRows.length > 1) {
            return this.showToast('Warning', 'Select only one Account', 'warning');
        }
        const result = await CreateEditAccountModal.open({
            size: 'medium',
            recordId: this.selectedRows[0].Id
        });
        if (result === 'refresh') this.refreshData();
    }

    refreshData() {
        this.selectedRows = [];
        return refreshApex(this.wiredAccountsResult)
            .then(() => this.showToast('Success', 'Refreshed', 'success'))
            .catch(() => this.showToast('Error', 'Refresh failed', 'error'));
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get isEditDisabled() {
        return this.selectedRows.length !== 1;
    }
}
