import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getAccounts from '@salesforce/apex/GuestOpportunityController.getAccounts';
import createOpportunity from '@salesforce/apex/GuestOpportunityController.createOpportunity';
import updateOpportunity from '@salesforce/apex/GuestOpportunityController.updateOpportunity';
import getOpportunityById from '@salesforce/apex/GuestOpportunityController.getOpportunityById';
import getOpportunityPicklistValues from '@salesforce/apex/GuestOpportunityController.getOpportunityPicklistValues';

export default class CreateOpportunity extends LightningModal {

    @api recordId;
    @api isViewMode = false;
    @track isLoading = false;
    @track accountOptions = [];

    @track stageOptions = [];
    @track typeOptions = [];
    @track opportunityTypeOptions = [];
    @track channelOptions = [];
    @track businessTypeOptions = [];
    @track geographyOptions = [];
    @track contactTypeOptions = [];
    @track directIndirectOptions = [];
    @track submittedByOptions = [];

    @track oppRecord = {
        AccountId: '',
        Name: '',
        CloseDate: '',
        StageName: '',
        Amount: null,
        Description: '',
        Type: '',
        Opportunity_Type__c: '',
        Channel__c: '',
        Business_Type__c: '',
        Geography__c: '',
        Contact_type__c: '',
        Direct_Indirect__c: '',
        Submitted_by__c: '',
        Start_Date__c: '',
        End_Date__c: ''
    };

    async connectedCallback() {
        await this.loadPicklistValues();
        
        if (this.recordId) {
            this.isLoading = true;
            try {
                const rec = await getOpportunityById({ oppId: this.recordId });
                this.oppRecord = { ...rec };
            } catch (e) {
                console.error('Error loading opportunity:', e);
                this.toast('Error', 'Failed to load opportunity: ' + (e.body?.message || e.message), 'error');
            } finally {
                this.isLoading = false;
            }
        }

        try {
            const accounts = await getAccounts({ searchTerm: '' });
            this.accountOptions = accounts;
        } catch (e) {
            console.error('Error loading accounts:', e);
        }
    }

    async loadPicklistValues() {
        try {
            const picklistData = await getOpportunityPicklistValues();
            
            if (picklistData.StageName) {
                this.stageOptions = picklistData.StageName.map(val => ({ label: val, value: val }));
            }
            if (picklistData.Type) {
                this.typeOptions = picklistData.Type.map(val => ({ label: val, value: val }));
            }
            if (picklistData.Opportunity_Type__c) {
                this.opportunityTypeOptions = picklistData.Opportunity_Type__c.map(val => ({ label: val, value: val }));
            }
            if (picklistData.Channel__c) {
                this.channelOptions = picklistData.Channel__c.map(val => ({ label: val, value: val }));
            }
            if (picklistData.Business_Type__c) {
                this.businessTypeOptions = picklistData.Business_Type__c.map(val => ({ label: val, value: val }));
            }
            if (picklistData.Geography__c) {
                this.geographyOptions = picklistData.Geography__c.map(val => ({ label: val, value: val }));
            }
            if (picklistData.Contact_type__c) {
                this.contactTypeOptions = picklistData.Contact_type__c.map(val => ({ label: val, value: val }));
            }
            if (picklistData.Direct_Indirect__c) {
                this.directIndirectOptions = picklistData.Direct_Indirect__c.map(val => ({ label: val, value: val }));
            }
            if (picklistData.Submitted_by__c) {
                this.submittedByOptions = picklistData.Submitted_by__c.map(val => ({ label: val, value: val }));
            }
        } catch (e) {
            console.error('Error loading picklist values:', e);
        }
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this.oppRecord[field] = event.target.value;
        console.log('Field changed:', field, '=', event.target.value);
    }

    async handleSave() {
        // Validate required fields
        if (!this.oppRecord.Name || !this.oppRecord.CloseDate || !this.oppRecord.StageName || !this.oppRecord.AccountId) {
            this.toast('Error', 'Please fill all required fields: Account, Name, Stage, and Close Date', 'error');
            return;
        }

        console.log('Saving opportunity with data:', JSON.stringify(this.oppRecord, null, 2));

        this.isLoading = true;
        try {
            let result;
            if (this.recordId) {
                result = await updateOpportunity({ oppId: this.recordId, oppData: this.oppRecord });
                console.log('Update result:', result);
            } else {
                result = await createOpportunity({ oppData: this.oppRecord });
                console.log('Create result:', result);
            }

            this.toast('Success', 'Opportunity saved successfully!', 'success');
            this.close('refresh');
        } catch (e) {
            console.error('Error saving opportunity:', e);
            
            // More detailed error message
            let errorMessage = 'Unknown error occurred';
            
            if (e.body) {
                if (e.body.message) {
                    errorMessage = e.body.message;
                } else if (e.body.fieldErrors) {
                    errorMessage = JSON.stringify(e.body.fieldErrors);
                } else if (e.body.pageErrors && e.body.pageErrors.length > 0) {
                    errorMessage = e.body.pageErrors[0].message;
                }
            } else if (e.message) {
                errorMessage = e.message;
            }
            
            console.error('Detailed error:', errorMessage);
            this.toast('Error', errorMessage, 'error');
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
        if (this.isViewMode) return 'View Opportunity';
        return this.recordId ? 'Edit Opportunity' : 'Create Opportunity';
    }
}