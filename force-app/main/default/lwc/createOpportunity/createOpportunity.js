import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import createOpportunity from '@salesforce/apex/GuestOpportunityController.createOpportunity';
import updateOpportunity from '@salesforce/apex/GuestOpportunityController.updateOpportunity';
import getOpportunityById from '@salesforce/apex/GuestOpportunityController.getOpportunityById';

export default class CreateOpportunity extends NavigationMixin(LightningElement) {
    @api showTitle;
    @api customTitle = 'Create Opportunity';
    @api cardIconName = 'standard:opportunity';
    @api redirectAfterCreate = false;
    @api resetFormAfterCreate = false;
    @api opportunityIdToUpdate;
    
    @track showSuccess = false;
    @track errorMessage = '';
    @track isLoading = false;
    @track createdOpportunityId = '';
    
    @track opportunityName = '';
    @track accountId = '';
    @track accountName = '';
    @track amount = '';
    @track closeDate = '';
    @track stageName = '';
    @track probability = '';
    @track oppType = '';
    @track leadSource = '';
    @track nextStep = '';
    @track description = '';
    
    connectedCallback() {
        if (this.opportunityIdToUpdate) {
            this.loadOpportunity();
        }
    }
    
    loadOpportunity() {
        this.isLoading = true;
        getOpportunityById({ oppId: this.opportunityIdToUpdate })
            .then(result => {
                this.opportunityName = result.Name;
                this.accountId = result.AccountId;
                this.amount = result.Amount;
                this.closeDate = result.CloseDate;
                this.stageName = result.StageName;
                this.probability = result.Probability;
                this.oppType = result.Type;
                this.leadSource = result.LeadSource;
                this.nextStep = result.NextStep;
                this.description = result.Description;
                this.isLoading = false;
            })
            .catch(error => {
                this.handleError(error);
            });
    }
    
    get stageOptions() {
        return [
            { label: 'Prospecting', value: 'Prospecting' },
            { label: 'Qualification', value: 'Qualification' },
            { label: 'Needs Analysis', value: 'Needs Analysis' },
            { label: 'Value Proposition', value: 'Value Proposition' },
            { label: 'Id. Decision Makers', value: 'Id. Decision Makers' },
            { label: 'Perception Analysis', value: 'Perception Analysis' },
            { label: 'Proposal/Price Quote', value: 'Proposal/Price Quote' },
            { label: 'Negotiation/Review', value: 'Negotiation/Review' },
            { label: 'Closed Won', value: 'Closed Won' },
            { label: 'Closed Lost', value: 'Closed Lost' }
        ];
    }
    
    get typeOptions() {
        return [
            { label: '--None--', value: '' },
            { label: 'Existing Customer - Upgrade', value: 'Existing Customer - Upgrade' },
            { label: 'Existing Customer - Replacement', value: 'Existing Customer - Replacement' },
            { label: 'Existing Customer - Downgrade', value: 'Existing Customer - Downgrade' },
            { label: 'New Customer', value: 'New Customer' }
        ];
    }
    
    get leadSourceOptions() {
        return [
            { label: '--None--', value: '' },
            { label: 'Web', value: 'Web' },
            { label: 'Phone Inquiry', value: 'Phone Inquiry' },
            { label: 'Partner Referral', value: 'Partner Referral' },
            { label: 'Purchased List', value: 'Purchased List' },
            { label: 'Other', value: 'Other' }
        ];
    }
    
    get isUpdateMode() {
        return this.opportunityIdToUpdate != null;
    }
    
    get buttonLabel() {
        return this.isUpdateMode ? 'Update Opportunity' : 'Create Opportunity';
    }
    
    get pageTitle() {
        return (this.showTitle !== false) ? this.customTitle : null;
    }
    
    handleInputChange(event) {
        const field = event.target.name;
        this[field] = event.target.value;
    }
    
    handleSubmit(event) {
        event.preventDefault();
        
        this.showSuccess = false;
        this.errorMessage = '';
        
        if (!this.validateRequiredFields()) {
            return;
        }
        
        this.isLoading = true;
        
        const oppData = {
            Name: this.opportunityName,
            AccountId: this.accountId,
            Amount: this.amount ? parseFloat(this.amount) : null,
            CloseDate: this.closeDate,
            StageName: this.stageName,
            Probability: this.probability ? parseFloat(this.probability) : null,
            Type: this.oppType,
            LeadSource: this.leadSource,
            NextStep: this.nextStep,
            Description: this.description
        };
        
        if (this.isUpdateMode) {
            this.updateOpportunityRecord(oppData);
        } else {
            this.createOpportunityRecord(oppData);
        }
    }
    
    createOpportunityRecord(oppData) {
        createOpportunity({ oppData: oppData })
            .then(result => {
                this.isLoading = false;
                this.createdOpportunityId = result;
                this.showSuccess = true;
                
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Opportunity created successfully!',
                        variant: 'success'
                    })
                );
                
                this.dispatchEvent(new CustomEvent('opportunitysaved', {
                    detail: { recordId: result }
                }));
                
                setTimeout(() => {
                    this.showSuccess = false;
                }, 5000);
                
                if (this.redirectAfterCreate) {
                    this.navigateToRecord(result);
                } else if (this.resetFormAfterCreate) {
                    setTimeout(() => {
                        this.resetForm();
                    }, 2000);
                }
            })
            .catch(error => {
                this.handleError(error);
            });
    }
    
    updateOpportunityRecord(oppData) {
        updateOpportunity({ oppId: this.opportunityIdToUpdate, oppData: oppData })
            .then(result => {
                this.isLoading = false;
                this.showSuccess = true;
                
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: result,
                        variant: 'success'
                    })
                );
                
                this.dispatchEvent(new CustomEvent('opportunityupdated', {
                    detail: { recordId: this.opportunityIdToUpdate }
                }));
                
                setTimeout(() => {
                    this.showSuccess = false;
                }, 5000);
                
                if (this.redirectAfterCreate) {
                    this.navigateToRecord(this.opportunityIdToUpdate);
                }
            })
            .catch(error => {
                this.handleError(error);
            });
    }
    
    handleError(error) {
        this.isLoading = false;
        this.showSuccess = false;
        
        let message = 'Unknown error';
        if (error.body && error.body.message) {
            message = error.body.message;
        } else if (error.message) {
            message = error.message;
        }
        
        this.errorMessage = message;
        
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: message,
                variant: 'error',
                mode: 'sticky'
            })
        );
        
        this.dispatchEvent(new CustomEvent('opportunityerror', {
            detail: { error: message }
        }));
    }
    
    validateRequiredFields() {
        let isValid = true;
        
        if (!this.opportunityName || this.opportunityName.trim() === '') {
            this.errorMessage = 'Opportunity Name is required';
            isValid = false;
        } else if (!this.closeDate) {
            this.errorMessage = 'Close Date is required';
            isValid = false;
        } else if (!this.stageName || this.stageName.trim() === '') {
            this.errorMessage = 'Stage is required';
            isValid = false;
        }
        
        return isValid;
    }
    
    handleCancel() {
        this.resetForm();
        this.dispatchEvent(new CustomEvent('cancel'));
    }
    
    resetForm() {
        this.opportunityName = '';
        this.accountId = '';
        this.accountName = '';
        this.amount = '';
        this.closeDate = '';
        this.stageName = '';
        this.probability = '';
        this.oppType = '';
        this.leadSource = '';
        this.nextStep = '';
        this.description = '';
        
        this.showSuccess = false;
        this.errorMessage = '';
        this.createdOpportunityId = '';
    }
    
    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'Opportunity',
                actionName: 'view'
            }
        });
    }
    
    @api
    submitForm() {
        const submitButton = this.template.querySelector('lightning-button[data-id="submit-button"]');
        if (submitButton) {
            submitButton.click();
        }
    }
    
    @api
    clearForm() {
        this.resetForm();
    }
}