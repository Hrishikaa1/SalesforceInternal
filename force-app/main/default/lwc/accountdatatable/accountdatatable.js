import { LightningElement, wire, track } from 'lwc';
import MethodForAcc from '@salesforce/apex/AccountDatatableCls.MethodForAcc';
import { updateRecord, createRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import LEAD_OBJECT from '@salesforce/schema/Lead';

export default class Accountdatatable extends LightningElement {
    @track Leads = [];
    @track error;
    @track draftValues = [];
    @track newRows = [];
    wiredAccountsResult;
    rowIdCounter = 0;

    // Define columns for the datatable
    columns = [
        { label: 'Lead ID', fieldName: 'Id', type: 'text', editable: false },
        { label: 'Phone', fieldName: 'Phone', type: 'phone', editable: true },
        { label: 'Company', fieldName: 'Company', type: 'text', editable: true },
        { label: 'Industry', fieldName: 'Industry', type: 'picklist', editable: true },
        { label: 'Rating', fieldName: 'Rating', type: 'picklist', editable: true },
        { label: 'Last Name', fieldName: 'LastName', type: 'text', editable: true }
    ];

    @wire(MethodForAcc)
    wiredAccounts(result) {
        this.wiredAccountsResult = result;
        if (result.data) {
            this.Leads = [...result.data];
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error.body?.message || 'Unknown error occurred';
            this.Leads = [];
        }
    }

    get isSaveDisabled() {
        return this.draftValues.length === 0 && this.newRows.length === 0;
    }

    // Add a new blank row
    handleAddRow() {
        const newRow = {
            Id: `temp-${this.rowIdCounter++}`,
            Phone: '',
            Company: '',
            Industry: '',
            Rating: '',
            LastName: '',
            isNew: true
        };
        this.newRows.push(newRow);
        this.Leads = [...this.Leads, newRow];
    }

    // Handle inline save (pencil icon save)
    handleSave(event) {
        this.draftValues = event.detail.draftValues;
    }

    // Handle Save All button click
    handleSaveAll() {
        const recordsToUpdate = [];
        const recordsToCreate = [];

        // Process draft values (existing records to update)
        this.draftValues.forEach(draft => {
            const leadData = this.Leads.find(lead => lead.Id === draft.Id);
            if (leadData && !leadData.isNew) {
                recordsToUpdate.push({ fields: { ...draft } });
            } else if (leadData && leadData.isNew) {
                // New row that was edited
                recordsToCreate.push({
                    Phone: draft.Phone || leadData.Phone,
                    Company: draft.Company || leadData.Company,
                    Industry: draft.Industry || leadData.Industry,
                    Rating: draft.Rating || leadData.Rating,
                    LastName: draft.LastName || leadData.LastName || 'Default'
                });
            }
        });

        // Process completely new rows (not yet in draft values)
        this.newRows.forEach(newRow => {
            const isDrafted = this.draftValues.some(draft => draft.Id === newRow.Id);
            if (!isDrafted && newRow.LastName) {
                recordsToCreate.push({
                    Phone: newRow.Phone,
                    Company: newRow.Company,
                    Industry: newRow.Industry,
                    Rating: newRow.Rating,
                    LastName: newRow.LastName || 'Default'
                });
            }
        });

        const promises = [];

        // Update existing records
        if (recordsToUpdate.length > 0) {
            promises.push(...recordsToUpdate.map(record => updateRecord(record)));
        }

        // Create new records
        if (recordsToCreate.length > 0) {
            promises.push(...recordsToCreate.map(record => 
                createRecord({ apiName: LEAD_OBJECT.objectApiName, fields: record })
            ));
        }

        if (promises.length === 0) {
            this.showToast('Info', 'No changes to save', 'info');
            return;
        }

        Promise.all(promises)
            .then(() => {
                this.showToast('Success', 'Records Saved Successfully', 'success');
                this.draftValues = [];
                this.newRows = [];
                return refreshApex(this.wiredAccountsResult);
            })
            .catch(error => {
                const errorMessage = error.body?.message || error.message || 'Error saving records';
                this.showToast('Error', errorMessage, 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}