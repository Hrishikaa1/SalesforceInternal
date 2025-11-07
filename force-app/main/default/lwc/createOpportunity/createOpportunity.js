import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import OPPORTUNITY_OBJECT from '@salesforce/schema/Opportunity';

// Picklist field imports
import STAGE_FIELD from '@salesforce/schema/Opportunity.StageName';
import TYPE_FIELD from '@salesforce/schema/Opportunity.Type';
import OPP_TYPE_FIELD from '@salesforce/schema/Opportunity.Opportunity_Type__c';
import CHANNEL_FIELD from '@salesforce/schema/Opportunity.Channel__c';
import GEOGRAPHY_FIELD from '@salesforce/schema/Opportunity.Geography__c';
import DIRECT_INDIRECT_FIELD from '@salesforce/schema/Opportunity.Direct_Indirect__c';
import BUSINESS_TYPE_FIELD from '@salesforce/schema/Opportunity.Business_Type__c';
import CONTACT_TYPE_FIELD from '@salesforce/schema/Opportunity.Contact_type__c';
import OFFERING_FIELD from '@salesforce/schema/Opportunity.Offering__c';
import ENGAGEMENT_FIELD from '@salesforce/schema/Opportunity.Type_of_Engagement__c';

// Apex
import createOpportunity from '@salesforce/apex/GuestOpportunityController.createOpportunity';
import updateOpportunity from '@salesforce/apex/GuestOpportunityController.updateOpportunity';
import getOpportunityById from '@salesforce/apex/GuestOpportunityController.getOpportunityById';

export default class CreateOpportunity extends LightningModal {
    @api recordId; // Opportunity Id for edit

    @track isLoading = false;

    // Display-only context
    @track accountName = '';
    @track ownerName = '';

    // Editable payload
    @track oppRecord = {
        Name: '',
        Amount: null,
        CloseDate: '',
        StageName: '',
        Probability: null,
        Type: '',
        LeadSource: '',
        NextStep: '',
        Description: '',
        Opportunity_Type__c: '',
        Channel__c: '',
        Geography__c: '',
        Direct_Indirect__c: '',
        Business_Type__c: '',
        Contact_type__c: '',
        Offering__c: '',
        Number_of_Resources__c: null,
        Type_of_Engagement__c: '',
        Start_Date__c: '',
        End_Date__c: '',
        Project_Code__c: ''
        // AccountId / OwnerId intentionally not exposed for editing here
    };

    // ----- Object & Picklists (Dynamic) -----
    recordTypeId;

    @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT })
    oppInfo({ data }) {
        if (data) {
            this.recordTypeId = data.defaultRecordTypeId;
        }
    }

    // Each picklist wires against recordTypeId
    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: STAGE_FIELD })
    stagePicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: TYPE_FIELD })
    typePicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: OPP_TYPE_FIELD })
    oppTypePicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: CHANNEL_FIELD })
    channelPicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: GEOGRAPHY_FIELD })
    geographyPicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: DIRECT_INDIRECT_FIELD })
    directIndirectPicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: BUSINESS_TYPE_FIELD })
    businessTypePicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: CONTACT_TYPE_FIELD })
    contactTypePicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: OFFERING_FIELD })
    offeringPicklist;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: ENGAGEMENT_FIELD })
    engagementPicklist;

    // Combo options (pass-through of wire values)
    get stageOptions() { return this.stagePicklist?.data?.values || []; }
    get typeOptions() { return this.typePicklist?.data?.values || []; }
    get opportunityTypeOptions() { return this.oppTypePicklist?.data?.values || []; }
    get channelOptions() { return this.channelPicklist?.data?.values || []; }
    get geographyOptions() { return this.geographyPicklist?.data?.values || []; }
    get directIndirectOptions() { return this.directIndirectPicklist?.data?.values || []; }
    get businessTypeOptions() { return this.businessTypePicklist?.data?.values || []; }
    get contactTypeOptions() { return this.contactTypePicklist?.data?.values || []; }
    get offeringOptions() { return this.offeringPicklist?.data?.values || []; }
    get typeOfEngagementOptions() { return this.engagementPicklist?.data?.values || []; }

    connectedCallback() {
        if (this.recordId) {
            this.loadOpportunity();
        }
    }

    async loadOpportunity() {
        this.isLoading = true;
        try {
            const rec = await getOpportunityById({ oppId: this.recordId });
            // Normalize for UI
            this.oppRecord = {
                ...this.oppRecord,
                ...rec
            };
            this.accountName = rec?.Account?.Name || '';
            this.ownerName = rec?.Owner?.Name || '';
        } catch (e) {
            this.toast('Error', e.body?.message || e.message, 'error');
            this.close();
        } finally {
            this.isLoading = false;
        }
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        let value = event.target.value;

        // Normalize numeric fields
        if (['Amount', 'Probability', 'Number_of_Resources__c'].includes(field)) {
            value = value === '' || value === null ? null : Number(value);
        }
        this.oppRecord[field] = value;
    }

    async handleSave() {
        // Guardrails
        if (!this.oppRecord.Name || !this.oppRecord.CloseDate || !this.oppRecord.StageName) {
            this.toast('Error', 'Name, Close Date, and Stage are required.', 'error');
            return;
        }
        if (this.oppRecord.Start_Date__c && this.oppRecord.End_Date__c &&
            this.oppRecord.End_Date__c < this.oppRecord.Start_Date__c) {
            this.toast('Error', 'End Date must be on or after Start Date.', 'error');
            return;
        }

        this.isLoading = true;
        try {
            if (this.recordId) {
                await updateOpportunity({ oppId: this.recordId, oppData: this.oppRecord });
                this.toast('Success', 'Opportunity updated', 'success');
            } else {
                await createOpportunity({ oppData: this.oppRecord });
                this.toast('Success', 'Opportunity created', 'success');
            }
            this.close('refresh');
        } catch (e) {
            this.toast('Error', e.body?.message || e.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleCancel() { this.close(); }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get modalTitle() {
        return this.recordId ? 'Edit Opportunity' : 'Create New Opportunity';
    }
}
