import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createAccount from '@salesforce/apex/GuestAccountController.createAccount';
import updateAccount from '@salesforce/apex/GuestAccountController.updateAccount';
import getAccountById from '@salesforce/apex/GuestAccountController.getAccountById';


export default class CreateAccounts extends LightningModal {
    
 
    @api recordId; // AccountId for edit

    @track isLoading = false;

    @track AccountRecord = {
        Overall_Rating__c: '',
        Website: '',
        Phone: '',
        Fax: '',
        Direct_Indirect__c: '',
        Name: ''

    };

    connectedCallback() {
        if (this.recordId) {
            this.loadAccount();
        }
    }

    async loadAccount() {
        this.isLoading = true;
        try {
            const rec = await getAccountById({ AccountId: this.recordId });
            // Normalize to our local shape
            this.AccountRecord = {
                Overall_Rating__c: rec.Overall_Rating__c || '',
                Website: rec.Website || '',
                Phone: rec.Phone || '',
                Fax: rec.Fax || '',
                Direct_Indirect__c: rec.Direct_Indirect__c || '',
                Name: rec.Name || ''
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
        this.AccountRecord[field] = event.target.value;
    }

    async handleSave() {
        if (!this.AccountRecord.Name) {
            this.toast('Error', ' Name is required', 'error');
            return;
        }

        this.isLoading = true;
        try {
            if (this.recordId) {
                // Edit existing
                await updateAccount({
                    AccountId: this.recordId,
                    AccountData: this.AccountRecord
                });
                this.toast('Success', 'Account updated', 'success');
            } else {
                // Create new (always insert a fresh record)
                await createAccount({
                    AccountData: this.AccountRecord
                });
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

