import { LightningElement, wire, track } from 'lwc';
import getAccounts from '@salesforce/apex/GuestAccountController.getAccounts';
import CreateEditAccountModal from 'c/createAccounts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class Accountsdatatablev2 extends LightningElement {
    @track accounts = [];
    @track error;
    @track isLoading = false;
    wiredAccountsResult;

    @wire(getAccounts)
    wiredAccounts(result) {
        this.wiredAccountsResult = result;
        this.isLoading = true;
        
        if (result.data) {
            console.log('Accounts loaded:', result.data);
            this.accounts = result.data.map((account, index) => ({
                ...account,
                rowNumber: index + 1
            }));
            this.error = undefined;
            this.isLoading = false;
        } else if (result.error) {
            console.error('Error loading accounts:', result.error);
            this.accounts = [];
            this.error = result.error?.body?.message || 'Unknown error loading accounts';
            this.isLoading = false;
        }
    }

    get hasAccounts() {
        return this.accounts && this.accounts.length > 0;
    }

    handleEditClick(event) {
        const accountId = event.target.dataset.id;
        this.openModal(accountId, false);
    }

    handleViewClick(event) {
        const accountId = event.target.dataset.id;
        this.openModal(accountId, true);
    }

    async handleCreateAccount() {
        const result = await CreateEditAccountModal.open({ 
            size: 'medium',
            isViewMode: false
        });
        if (result === 'refresh') this.refreshData();
    }

    async openModal(recordId, isViewMode) {
        const result = await CreateEditAccountModal.open({
            size: 'medium',
            recordId: recordId,
            isViewMode: isViewMode
        });
        if (result === 'refresh') this.refreshData();
    }

    refreshData() {
        this.isLoading = true;
        return refreshApex(this.wiredAccountsResult)
            .then(() => {
                this.showToast('Success', 'Data refreshed', 'success');
            })
            .catch(() => {
                this.showToast('Error', 'Refresh failed', 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}