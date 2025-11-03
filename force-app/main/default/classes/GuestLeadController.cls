/**
 * ------------------------------------------------------------------------------
 * @description     Controller for creating, updating, and retrieving Lead records
 * @author          Hrishika
 * @date            03-Nov-2025
 * @version         1.0
 * 
 * @scope           Designed for guest user operations within Experience Cloud
 * @notes           Includes field-level handling for the following Lead fields:
 *                  Channel__c, Title, Geography__c, Direct_Indirect__c,
 *                  Business_Type__c, Contact_type__c, Status, Phone, Rating, Email
 * 
 * @security        Runs without sharing — ensure field-level security via LWC/Aura
 * ------------------------------------------------------------------------------
 */

public without sharing class GuestLeadController {

    /**
     * @description Creates a new Lead record with restricted field scope.
     * @param leadData  Map of Lead field API names to their respective values.
     * @return          String - Newly created Lead Id.
     */
    @AuraEnabled
    public static String createLead(Map<String, Object> leadData) {
        try {
            // Validate mandatory fields
            validateRequiredFields(leadData);

            // Initialize new Lead
            Lead newLead = new Lead();

            // Assign allowed fields dynamically
            List<String> allowedFields = new List<String>{
                'Channel__c', 'Title', 'Geography__c', 'Direct_Indirect__c',
                'Business_Type__c', 'Contact_type__c', 'Status',
                'Phone', 'Rating', 'Email', 'LastName', 'Company'
            };

            for (String fieldName : leadData.keySet()) {
                if (allowedFields.contains(fieldName)) {
                    Object fieldValue = leadData.get(fieldName);
                    if (fieldValue != null && String.valueOf(fieldValue).trim() != '') {
                        newLead.put(fieldName, fieldValue);
                    }
                }
            }

            // Set default values if not provided
            if (newLead.Status == null) {
                newLead.Status = 'Open - Not Contacted';
            }

            insert newLead;
            return newLead.Id;

        } catch (DmlException e) {
            throw new AuraHandledException('Error creating Lead: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }

    /**
     * @description Updates an existing Lead record with limited editable fields.
     * @param leadId    Id of the Lead to update.
     * @param leadData  Map of field API names to updated values.
     * @return          String - Confirmation message.
     */
    @AuraEnabled
    public static String updateLead(String leadId, Map<String, Object> leadData) {
        try {
            if (String.isBlank(leadId)) {
                throw new AuraHandledException('Lead Id is required');
            }

            Lead existingLead = [
                SELECT Id 
                FROM Lead 
                WHERE Id = :leadId 
                LIMIT 1
            ];

            List<String> allowedFields = new List<String>{
                'Channel__c', 'Title', 'Geography__c', 'Direct_Indirect__c',
                'Business_Type__c', 'Contact_type__c', 'Status',
                'Phone', 'Rating', 'Email'
            };

            for (String fieldName : leadData.keySet()) {
                if (allowedFields.contains(fieldName)) {
                    Object fieldValue = leadData.get(fieldName);
                    if (fieldValue != null && String.valueOf(fieldValue).trim() != '') {
                        existingLead.put(fieldName, fieldValue);
                    }
                }
            }

            update existingLead;
            return 'Lead updated successfully';

        } catch (QueryException e) {
            throw new AuraHandledException('Lead not found');
        } catch (DmlException e) {
            throw new AuraHandledException('Error updating Lead: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }

    /**
     * @description Retrieves a Lead by Id with only relevant fields.
     * @param leadId  Lead Id.
     * @return        Lead record with selected fields.
     */
    @AuraEnabled(cacheable=true)
    public static Lead getLeadById(String leadId) {
        try {
            if (String.isBlank(leadId)) {
                throw new AuraHandledException('Lead Id is required');
            }

            return [
                SELECT Id, Channel__c, Title, Geography__c, Direct_Indirect__c,
                       Business_Type__c, Contact_type__c, Status,
                       Phone, Rating, Email, LastName, Company
                FROM Lead
                WHERE Id = :leadId
                LIMIT 1
            ];

        } catch (QueryException e) {
            throw new AuraHandledException('Lead not found');
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }

    /**
     * @description Validates mandatory fields and email format.
     * @param leadData  Lead data map.
     */
    private static void validateRequiredFields(Map<String, Object> leadData) {
        if (!leadData.containsKey('LastName') || String.isBlank(String.valueOf(leadData.get('LastName')))) {
            throw new AuraHandledException('Last Name is required');
        }

        if (!leadData.containsKey('Company') || String.isBlank(String.valueOf(leadData.get('Company')))) {
            throw new AuraHandledException('Company is required');
        }

        if (leadData.containsKey('Email') && String.isNotBlank(String.valueOf(leadData.get('Email')))) {
            String emailValue = String.valueOf(leadData.get('Email'));
            if (!isValidEmail(emailValue)) {
                throw new AuraHandledException('Invalid email format');
            }
        }
    }

    /**
     * @description Validates basic email structure using regex.
     * @param email  Email string.
     * @return       Boolean true if valid, false otherwise.
     */
    private static Boolean isValidEmail(String email) {
        String emailRegex = '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,4}$';
        Pattern pattern = Pattern.compile(emailRegex);
        Matcher matcher = pattern.matcher(email);
        return matcher.matches();
    }
}
