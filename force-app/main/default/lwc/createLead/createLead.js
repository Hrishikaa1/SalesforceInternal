import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import createLead from '@salesforce/apex/GuestLeadController.createLead';
import updateLead from '@salesforce/apex/GuestLeadController.updateLead';
import getLeadById from '@salesforce/apex/GuestLeadController.getLeadById';

export default class CreateLeadApex extends NavigationMixin(LightningElement) {
    @api showTitle;
    @api customTitle = 'Create New Lead';
    @api cardIconName = 'standard:lead';
    @api redirectAfterCreate = false;
    @api resetFormAfterCreate = false;
    _leadIdToUpdate;
    @api
    get leadIdToUpdate() {
        return this._leadIdToUpdate;
    }
    set leadIdToUpdate(value) {
        this._leadIdToUpdate = value;
        if (value) {
            this.loadLead();
        }
    }
    @api recordId; // If placed on a record page, this will be populated automatically
    
    @track showSuccess = false;
    @track errorMessage = '';
    @track isLoading = false;
    @track createdLeadId = '';
    
    // Form field values
    @track firstName = '';
    @track lastName = '';
    @track email = '';
    @track phone = '';
    @track company = '';
    @track title = '';
    @track leadSource = '';
    @track status = '';
    @track industry = '';
    @track rating = '';
    @track street = '';
    @track city = '';
    @track state = '';
    @track postalCode = '';
    @track country = '';
    @track website = '';
    @track description = '';
    
    // Picklist options
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
    
    get statusOptions() {
        return [
            { label: '--None--', value: '' },
            { label: 'Open - Not Contacted', value: 'Open - Not Contacted' },
            { label: 'Working - Contacted', value: 'Working - Contacted' },
            { label: 'Closed - Converted', value: 'Closed - Converted' },
            { label: 'Closed - Not Converted', value: 'Closed - Not Converted' }
        ];
    }
    
    get industryOptions() {
        return [
            { label: '--None--', value: '' },
            { label: 'Agriculture', value: 'Agriculture' },
            { label: 'Apparel', value: 'Apparel' },
            { label: 'Banking', value: 'Banking' },
            { label: 'Biotechnology', value: 'Biotechnology' },
            { label: 'Chemicals', value: 'Chemicals' },
            { label: 'Communications', value: 'Communications' },
            { label: 'Construction', value: 'Construction' },
            { label: 'Consulting', value: 'Consulting' },
            { label: 'Education', value: 'Education' },
            { label: 'Electronics', value: 'Electronics' },
            { label: 'Energy', value: 'Energy' },
            { label: 'Engineering', value: 'Engineering' },
            { label: 'Entertainment', value: 'Entertainment' },
            { label: 'Environmental', value: 'Environmental' },
            { label: 'Finance', value: 'Finance' },
            { label: 'Food & Beverage', value: 'Food & Beverage' },
            { label: 'Government', value: 'Government' },
            { label: 'Healthcare', value: 'Healthcare' },
            { label: 'Hospitality', value: 'Hospitality' },
            { label: 'Insurance', value: 'Insurance' },
            { label: 'Machinery', value: 'Machinery' },
            { label: 'Manufacturing', value: 'Manufacturing' },
            { label: 'Media', value: 'Media' },
            { label: 'Not For Profit', value: 'Not For Profit' },
            { label: 'Recreation', value: 'Recreation' },
            { label: 'Retail', value: 'Retail' },
            { label: 'Shipping', value: 'Shipping' },
            { label: 'Technology', value: 'Technology' },
            { label: 'Telecommunications', value: 'Telecommunications' },
            { label: 'Transportation', value: 'Transportation' },
            { label: 'Utilities', value: 'Utilities' },
            { label: 'Other', value: 'Other' }
        ];
    }
    
    get ratingOptions() {
        return [
            { label: '--None--', value: '' },
            { label: 'Hot', value: 'Hot' },
            { label: 'Warm', value: 'Warm' },
            { label: 'Cold', value: 'Cold' }
        ];
    }
    
    get isUpdateMode() {
        return this._leadIdToUpdate != null || this.recordId != null;
    }
    
    get buttonLabel() {
        return this.isUpdateMode ? 'Update Lead' : 'Create Lead';
    }
    
    get pageTitle() {
        if (this.showTitle === false) {
            return null;
        }
        // If the default title is being used, switch it when in update mode
        if (this.isUpdateMode && this.customTitle === 'Create New Lead') {
            return 'Update Lead';
        }
        return this.customTitle;
    }
    
    handleInputChange(event) {
        const field = event.target.name;
        this[field] = event.target.value;
    }
    
    handleSubmit(event) {
        event.preventDefault();
        
        // Clear previous messages
        this.showSuccess = false;
        this.errorMessage = '';
        
        // Validate required fields
        if (!this.validateRequiredFields()) {
            return;
        }
        
        this.isLoading = true;
        
        // Prepare data
        const leadData = {
            FirstName: this.firstName,
            LastName: this.lastName,
            Email: this.email,
            Phone: this.phone,
            Company: this.company,
            Title: this.title,
            LeadSource: this.leadSource,
            Status: this.status,
            Industry: this.industry,
            Rating: this.rating,
            Street: this.street,
            City: this.city,
            State: this.state,
            PostalCode: this.postalCode,
            Country: this.country,
            Website: this.website,
            Description: this.description
        };
        
        // Call appropriate Apex method
        if (this.isUpdateMode) {
            this.updateLeadRecord(leadData);
        } else {
            this.createLeadRecord(leadData);
        }
    }
    
    createLeadRecord(leadData) {
        createLead({ leadData: leadData })
            .then(result => {
                this.isLoading = false;
                this.createdLeadId = result;
                this.showSuccess = true;
                
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Lead created successfully!',
                        variant: 'success'
                    })
                );
                
                // Dispatch custom event
                this.dispatchEvent(new CustomEvent('leadsaved', {
                    detail: { recordId: result }
                }));
                
                // Auto-hide success message
                setTimeout(() => {
                    this.showSuccess = false;
                }, 5000);
                
                // Handle post-creation actions
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
    
    updateLeadRecord(leadData) {
        updateLead({ leadId: this.leadIdToUpdate, leadData: leadData })
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
                
                // Dispatch custom event
                this.dispatchEvent(new CustomEvent('leadupdated', {
                    detail: { recordId: this.leadIdToUpdate }
                }));
                
                // Auto-hide success message
                setTimeout(() => {
                    this.showSuccess = false;
                }, 5000);
                
                if (this.redirectAfterCreate) {
                    this.navigateToRecord(this.leadIdToUpdate);
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
        
        // Dispatch custom error event
        this.dispatchEvent(new CustomEvent('leaderror', {
            detail: { error: message }
        }));
    }
    
    validateRequiredFields() {
        let isValid = true;
        
        // Check required fields
        if (!this.lastName || this.lastName.trim() === '') {
            this.errorMessage = 'Last Name is required';
            isValid = false;
        } else if (!this.company || this.company.trim() === '') {
            this.errorMessage = 'Company is required';
            isValid = false;
        } else if (this.email && !this.validateEmail(this.email)) {
            this.errorMessage = 'Please enter a valid email address';
            isValid = false;
        }
        
        return isValid;
    }
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    connectedCallback() {
        // If the component is placed on a record page, recordId will be populated
        if (this.recordId && !this._leadIdToUpdate) {
            this._leadIdToUpdate = this.recordId;
        }
        if (this.isUpdateMode) {
            this.loadLead();
        }
    }

    async loadLead() {
        const id = this._leadIdToUpdate || this.recordId;
        if (!id) {
            return;
        }
        this.isLoading = true;
        this.errorMessage = '';
        try {
            const lead = await getLeadById({ leadId: id });
            this.populateFormFromRecord(lead);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isLoading = false;
        }
    }

    populateFormFromRecord(lead) {
        if (!lead) { return; }
        this.firstName = lead.FirstName || '';
        this.lastName = lead.LastName || '';
        this.email = lead.Email || '';
        this.phone = lead.Phone || '';
        this.company = lead.Company || '';
        this.title = lead.Title || '';
        this.leadSource = lead.LeadSource || '';
        this.status = lead.Status || '';
        this.industry = lead.Industry || '';
        this.rating = lead.Rating || '';
        this.street = lead.Street || '';
        this.city = lead.City || '';
        this.state = lead.State || '';
        this.postalCode = lead.PostalCode || '';
        this.country = lead.Country || '';
        this.website = lead.Website || '';
        this.description = lead.Description || '';
    }
    
    @wire(CurrentPageReference)
    setCurrentPageReference(pageRef) {
        if (!pageRef) return;
        const state = pageRef.state || {};
        const pid = state.c__leadId || state.leadId || state.c__recordId || state.recordId;
        if (pid && (!this._leadIdToUpdate || this._leadIdToUpdate !== pid)) {
            this._leadIdToUpdate = pid;
            this.loadLead();
        }
    }
     
    handleCancel() {
        this.resetForm();
        this.dispatchEvent(new CustomEvent('cancel'));
    }
    
    resetForm() {
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.phone = '';
        this.company = '';
        this.title = '';
        this.leadSource = '';
        this.status = '';
        this.industry = '';
        this.rating = '';
        this.street = '';
        this.city = '';
        this.state = '';
        this.postalCode = '';
        this.country = '';
        this.website = '';
        this.description = '';
        
        this.showSuccess = false;
        this.errorMessage = '';
        this.createdLeadId = '';
    }
    
    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'Lead',
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