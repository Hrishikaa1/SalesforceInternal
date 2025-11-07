import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getAccounts from '@salesforce/apex/GuestOpportunityController.getAccounts';
import createOpportunity from '@salesforce/apex/GuestOpportunityController.createOpportunity';
import updateOpportunity from '@salesforce/apex/GuestOpportunityController.updateOpportunity';
import getOpportunityById from '@salesforce/apex/GuestOpportunityController.getOpportunityById';

import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import OPPORTUNITY_OBJECT from '@salesforce/schema/Opportunity';

import STAGE_FIELD from '@salesforce/schema/Opportunity.StageName';
import TYPE_FIELD from '@salesforce/schema/Opportunity.Type';
import OPP_TYPE_FIELD from '@salesforce/schema/Opportunity.Opportunity_Type__c';
import CHANNEL_FIELD from '@salesforce/schema/Opportunity.Channel__c';
import BUSINESS_TYPE_FIELD from '@salesforce/schema/Opportunity.Business_Type__c';

export default class CreateOpportunity extends LightningModal {

    @api recordId;
    @track isLoading = false;
    @track accountOptions = [];

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
        Start_Date__c: '',
        End_Date__c: ''
    };

    recordTypeId;

    @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT })
    oppInfo({ data }) {
        if (data) this.recordTypeId = data.defaultRecordTypeId;
    }

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: STAGE_FIELD }) stagePicklist;
    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: TYPE_FIELD }) typePicklist;
    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: OPP_TYPE_FIELD }) oppTypePicklist;
    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: CHANNEL_FIELD }) channelPicklist;
    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: BUSINESS_TYPE_FIELD }) businessTypePicklist;

    get stageOptions() { return this.stagePicklist?.data?.values || []; }
    get typeOptions() { return this.typePicklist?.data?.values || []; }
    get opportunityTypeOptions() { return this.oppTypePicklist?.data?.values || []; }
    get channelOptions() { return this.channelPicklist?.data?.values || []; }
    get businessTypeOptions() { return this.businessTypePicklist?.data?.values || []; }

    async connectedCallback() {
        if (this.recordId) {
            this.isLoading = true;
            const rec = await getOpportunityById({ oppId: this.recordId });
            this.oppRecord = { ...rec };
            this.isLoading = false;
        }

        const accounts = await getAccounts({ searchTerm: '' });
        this.accountOptions = accounts;
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this.oppRecord[field] = event.target.value;
    }

    async handleSave() {
        if (!this.oppRecord.Name || !this.oppRecord.CloseDate || !this.oppRecord.StageName || !this.oppRecord.AccountId) {
            this.toast('Error', 'All required fields must be completed.', 'error');
            return;
        }

        this.isLoading = true;
        try {
            this.recordId
                ? await updateOpportunity({ oppId: this.recordId, oppData: this.oppRecord })
                : await createOpportunity({ oppData: this.oppRecord });

            this.toast('Success', 'Record saved successfully.', 'success');
            this.close('refresh');
        } catch (e) {
            this.toast('Error', e.body?.message || e.message, 'error');
        }
        this.isLoading = false;
    }

    handleCancel() { this.close(); }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get modalTitle() {
        return this.recordId ? 'Edit Opportunity' : 'Create Opportunity';
    }
}
