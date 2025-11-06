
import { LightningElement, wire, track } from 'lwc';
import getAccounts from '@salesforce/apex/guestAccountController.getAccounts';
import CreateEditAccountModal from 'c/createAccounts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class Accountsdatatablev2 extends LightningElement {

     @track Accounts = [];
    @track error;
    @track selectedRows = [];
    wiredAccountsResult;

    columns = [
       // { label: 'Account ID', fieldName: 'Id', type: 'text' },
        { label: 'Name', fieldName: 'Name', type: 'text' },
       // { label: 'Account ID', fieldName: 'AccountId', type: 'text' },
        { label: 'Overall Rating', fieldName: 'Overall_Rating__c', type: 'text' },
        { label: 'Mobile Website', fieldName: 'MobileWebsite', type: 'URL' },
        { label: 'Fax', fieldName: 'Fax', type: 'Phone' },
        { label: 'Phone', fieldName: 'Phone', type: 'Phone' },
        { label: 'Direct/Indirect', fieldName: 'Direct_Indirect__c', type: 'Picklist' }
    ];

    
    @wire(getAccounts)
    wiredAccounts(result) {
        this.wiredAccountsResult = result;
        if (result.data) {
            this.Accounts = [...result.data];
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error.body?.message || 'Unknown error';
            this.Accounts = [];
        }
    }

    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
    }
async handleCreateAccount() {
    const result = await CreateEditAccountModal.open({ size: 'medium' });
    if (result === 'refresh') this.refreshData();
}

    // 3) EDIT button handler (uncomment/replace)
async handleEditAccount() {
    if (!this.selectedRows.length) {
        this.showToast('Warning','Select one Account','warning');
        return;
    }
    if (this.selectedRows.length > 1) {
        this.showToast('Warning','Select only one Account','warning');
        return;
    }

    const result = await CreateEditAccountModal.open({
        size: 'medium',
        recordId: this.selectedRows[0].Id // use the selected checkbox row Id
    });
    if (result === 'refresh') this.refreshData();
}

    refreshData() {
        this.selectedRows = [];
        return refreshApex(this.wiredAccountsResult)
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

