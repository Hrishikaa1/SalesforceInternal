import { LightningElement, track ,api } from 'lwc';
import getPicklistFieldValues from '@salesforce/apex/CreateRecordType.getPicklistFieldValues';
import CreateBusinessProcess from '@salesforce/apex/BusinessProcessController.CreateBusinessProcess';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class InputForm extends LightningElement {
    @track processname = '';
    @track isActive = false;
    @track fieldName = '';
    @track isModalOpen = false;
    @track availablePicklistOptions = [];
    @track selectedPicklistValues = [];
    @track isLoading = false;
    @track processButtonClicked = false;
    processButtonError = ''; // This will hold the error message shown in the UI
    loadingMessage

    @track BusinessProcessJson = {
        fullName: '',
        isActive: false,
        values: []
    };

    @api selectedObjectName;  

    // You can now use this.selectedObjectName in your child component logic
    connectedCallback() {
        console.log('Selected Object in Child:', this.selectedObjectName);
    }
    handleProcessChange(event) {
        try {
            if (event && event.target) {
                this.processname = event.target.value || '';
                this.updateBaseJson();
            }
        } catch (error) {
            console.error('Error in handleProcessChange:', error);
            this.showToast('Error', 'An error occurred while updating process name', 'error');
        }
    }

    handleChange(event) {
        try {
            if (event && event.target) {
                this.selectedObjectName = event.target.value || '';
                this.updateBaseJson();
            }
        } catch (error) {
            console.error('Error in handleChange:', error);
            this.showToast('Error', 'An error occurred while updating object selection', 'error');
        }
    }

    handleActiveChange(event) {
        try {
            if (event && event.target) {
                this.isActive = event.target.checked || false;
                this.updateBaseJson();
            }
        } catch (error) {
            console.error('Error in handleActiveChange:', error);
            this.showToast('Error', 'An error occurred while updating active status', 'error');
        }
    }

    updateBaseJson() {
        try {
            this.BusinessProcessJson = {
                ...this.BusinessProcessJson,
                fullName: `${this.selectedObjectName || ''}.${this.processname || ''}`,
                isActive: this.isActive || false
            };
        } catch (error) {
            console.error('Error in updateBaseJson:', error);
            this.showToast('Error', 'An error occurred while updating process data', 'error');
        }
    }

    handelNext() {
        try {
            this.processButtonClicked = true;
            if (!this.selectedObjectName || !this.processname || !this.isActive) {
                this.showToast('Error', 'Please fill in all required fields', 'error');
                return;
            }

            this.isLoading = true;
            if(this.selectedObjectName=='Lead'){
                 this.fieldName='Status';
            }else if(this.selectedObjectName=='Opportunity'){
                 this.fieldName='StageName';
            }else if(this.selectedObjectName=='Case'){
                 this.fieldName='Status';
            }

            getPicklistFieldValues({
                objectApiName: this.selectedObjectName,
                fieldName: this.fieldName
            })
            .then(result => {
                if (Array.isArray(result)) {
                    this.availablePicklistOptions = result.map(value => ({
                        label: value,
                        value: value
                    }));
                    
                    // Initialize selected values if they exist in the JSON
                    this.selectedPicklistValues = this.BusinessProcessJson.values.map(v => v.fullName) || [];
                    this.isModalOpen = true;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                this.showToast('Error', 'Failed to fetch picklist values', 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
        } catch (error) {
            console.error('Error in handelNext:', error);
            this.showToast('Error', 'An error occurred while processing', 'error');
            this.isLoading = false;
        }
    }

    handlePicklistChange(event) {
        try {
            if (event && event.detail) {
                // Get the selected values from the dual listbox
                this.selectedPicklistValues = event.detail.value || [];
                

                    if(['Lead', 'Case'].includes(this.selectedObjectName)){
                // Create the values array with the correct structure
                // First value will be default_x: true, rest will be false
                this.BusinessProcessJson.values = this.selectedPicklistValues.map((value, index) => ({
                    fullName: value,
                    default_x: index === 0 // First value is default
                }));
                }else if(this.selectedObjectName=='Opportunity'){
                    this.BusinessProcessJson.values = this.selectedPicklistValues.map((value, index) => ({
                    fullName: value
                }));
                }
            }
        } catch (error) {
            console.error('Error in handlePicklistChange:', error);
            this.showToast('Error', 'An error occurred while updating selections', 'error');
        }
    }

    @api
    validateFields() {
        let isValid = true;
        const inputs = this.template.querySelectorAll('lightning-input');
        inputs.forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
            }
        });

        const dualListbox = this.template.querySelector('lightning-dual-listbox');
        if (dualListbox && (!dualListbox.value || dualListbox.value.length === 0)) {
            dualListbox.setCustomValidity('Select at least one value.');
            dualListbox.reportValidity();
            isValid = false;
        } else if (dualListbox) {
            dualListbox.setCustomValidity('');
            dualListbox.reportValidity();
        }

        if (this.isModalOpen) {
            const modalDualListbox = this.template.querySelector('lightning-dual-listbox[data-id="modal-dual-listbox"]');
            if (modalDualListbox && (!modalDualListbox.value || modalDualListbox.value.length === 0)) {
                modalDualListbox.setCustomValidity('Select at least one picklist value.');
                modalDualListbox.reportValidity();
                isValid = false;
            } else if (modalDualListbox) {
                modalDualListbox.setCustomValidity('');
                modalDualListbox.reportValidity();
            }
        }
        if (!this.processButtonClicked) {
            isValid = false;
        }
        

        return isValid;
    }


    handleSave() {
     
        if (!Array.isArray(this.selectedPicklistValues) || this.selectedPicklistValues.length === 0) {
            this.showToast('Error', 'Please select at least one value', 'error');
            return;
        }
        
        // Ensure the JSON structure is correct before saving
        const finalJson = {
            fullName: this.BusinessProcessJson.fullName,
            isActive: this.BusinessProcessJson.isActive,
            values: this.BusinessProcessJson.values
        };
        
        CreateBusinessProcess({ businessProcessJSON: JSON.stringify(finalJson) })
            .then(result => {
                 this.dispatchEvent(new CustomEvent('saveprocess', {
            detail: {
                message: 'True'
            }
        }));
               
    });
    }

           



    handleBack() {
        try {
            this.isModalOpen = false;
        } catch (error) {
            console.error('Error in handleBack:', error);
            this.showToast('Error', 'An error occurred while going back', 'error');
        }
    }

    showToast(title, message, variant) {
        try {
            this.dispatchEvent(new ShowToastEvent({
                title: title || 'Info',
                message: message || 'Operation completed',
                variant: variant || 'info'
            }));
        } catch (error) {
            console.error('Error in showToast:', error);
        }
    }
}