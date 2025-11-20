import { LightningElement, wire, track } from 'lwc';
import getContacts from '@salesforce/apex/GuestContactController.getContacts';
import CreateEditContactModal from 'c/createcontacts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class ContactDatatable extends LightningElement {
    @track contacts = [];
    @track error;
    @track isLoading = false;
    wiredContactsResult;

    @wire(getContacts)
    wiredContacts(result) {
        this.wiredContactsResult = result;
        this.isLoading = true;
        
        if (result.data) {
            console.log('Contacts loaded:', result.data);
            this.contacts = result.data.map((contact, index) => ({
                ...contact,
                rowNumber: index + 1
            }));
            this.error = undefined;
            this.isLoading = false;
        } else if (result.error) {
            console.error('Error loading contacts:', result.error);
            this.error = result.error.body?.message || 'Unknown error loading contacts';
            this.contacts = [];
            this.isLoading = false;
        }
    }

    get hasContacts() {
        return this.contacts && this.contacts.length > 0;
    }

    handleEditClick(event) {
        const contactId = event.target.dataset.id;
        this.openModal(contactId, false);
    }

    handleViewClick(event) {
        const contactId = event.target.dataset.id;
        this.openModal(contactId, true);
    }

    async handleCreateContact() {
        const result = await CreateEditContactModal.open({ 
            size: 'medium',
            isViewMode: false
        });
        if (result === 'refresh') this.refreshData();
    }

    async openModal(recordId, isViewMode) {
        const result = await CreateEditContactModal.open({
            size: 'medium',
            recordId: recordId,
            isViewMode: isViewMode
        });
        if (result === 'refresh') this.refreshData();
    }

    refreshData() {
        this.isLoading = true;
        return refreshApex(this.wiredContactsResult)
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

    showToast(t, m, v) {
        this.dispatchEvent(new ShowToastEvent({ title: t, message: m, variant: v }));
    }
}