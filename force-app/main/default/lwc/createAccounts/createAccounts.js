import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import createAccount from '@salesforce/apex/GuestAccountController.createAccount';
import updateAccount from '@salesforce/apex/GuestAccountController.updateAccount';
import getAccountById from '@salesforce/apex/GuestAccountController.getAccountById';

import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import ACCOUNT_OBJECT from '@salesforce/schema/Account';
import DIRECT_INDIRECT_FIELD from '@salesforce/schema/Account.Direct_Indirect__c';

export default class CreateAccounts extends LightningModal {
    @api recordId;
    @track isLoading = false;

    @track accountRecord = {
        Name: '',
        Direct_Indirect__c: '',
        Phone: '',
        Website: '',
        Fax: '',
        Overall_Rating__c: ''
    };

    // Pull picklist values for Direct_Indirect__c
    recordTypeId;
    @wire(getObjectInfo, { objectApiName: ACCOUNT_OBJECT })
    gotInfo({ data }) {
        if (data) this.recordTypeId = data.defaultRecordTypeId;
    }

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: DIRECT_INDIRECT_FIELD })
    directIndirectPicklist;

    get directIndirectOptions() {
        return this.directIndirectPicklist?.data?.values || [];
    }

    connectedCallback() {
        if (this.recordId) this.loadAccount();
    }

    async loadAccount() {
        this.isLoading = true;
        try {
            const rec = await getAccountById({ accountId: this.recordId });
            this.accountRecord = {
                Name: rec?.Name || '',
                Direct_Indirect__c: rec?.Direct_Indirect__c || '',
                Phone: rec?.Phone || '',
                Website: rec?.Website || '',
                Fax: rec?.Fax || '',
                Overall_Rating__c: rec?.Overall_Rating__c || ''
            };
        } catch (e) {
            this.toast('Error', e.body?.message || e.message, 'error');
            this.close();
        } finally {
            this.isLoading = false;
        }
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this.accountRecord[field] = event.target.value;
    }

    async handleSave() {
        // Local guardrails (mirror Apex)
        if (!this.accountRecord.Name || !this.accountRecord.Direct_Indirect__c) {
            this.toast('Error', 'Name and Direct/Indirect are required.', 'error');
            return;
        }

        this.isLoading = true;
        try {
            if (this.recordId) {
                await updateAccount({ accountId: this.recordId, accountData: this.accountRecord });
                this.toast('Success', 'Account updated', 'success');
            } else {
                await createAccount({ accountData: this.accountRecord });
                this.toast('Success', 'Account created', 'success');
            }
            this.close('refresh');
        } catch (e) {
            this.toast('Error', e.body?.message || e.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleCancel() {
        this.close();
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get modalTitle() {
        return this.recordId ? 'Edit Account' : 'Create New Account';
    }
}
