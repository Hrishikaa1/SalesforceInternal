
import { LightningElement, wire, track } from 'lwc';
import getContacts from '@salesforce/apex/GuestContactController.getContacts';
import CreateEditContactModal from 'c/createcontacts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class ContactDatatable extends LightningElement {
     @track contacts = [];
    @track error;
    @track selectedRows = [];
    wiredContactsResult;

    columns = [
        { label: 'Contact ID', fieldName: 'Id', type: 'text' },
        { label: 'Name', fieldName: 'Name', type: 'text' },
       // { label: 'Account ID', fieldName: 'AccountId', type: 'text' },
        { label: 'Phone', fieldName: 'Phone', type: 'phone' },
        { label: 'Mobile Phone', fieldName: 'MobilePhone', type: 'phone' },
        { label: 'Email', fieldName: 'Email', type: 'email' },
        { label: 'Contact Type', fieldName: 'Contact_type__c', type: 'text' }
    ];

    @wire(getContacts)
    wiredContacts(result) {
        this.wiredContactsResult = result;
        if (result.data) {
            this.contacts = [...result.data];
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error.body?.message || 'Unknown error';
            this.contacts = [];
        }
    }

    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
    }
async handleCreateContact() {
    const result = await CreateEditContactModal.open({ size: 'medium' });
    if (result === 'refresh') this.refreshData();
}

    // 3) EDIT button handler (uncomment/replace)
async handleEditContact() {
    if (!this.selectedRows.length) {
        this.showToast('Warning','Select one contact','warning');
        return;
    }
    if (this.selectedRows.length > 1) {
        this.showToast('Warning','Select only one contact','warning');
        return;
    }

    const result = await CreateEditContactModal.open({
        size: 'medium',
        recordId: this.selectedRows[0].Id // use the selected checkbox row Id
    });
    if (result === 'refresh') this.refreshData();
}

    refreshData() {
        this.selectedRows = [];
        return refreshApex(this.wiredContactsResult)
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
