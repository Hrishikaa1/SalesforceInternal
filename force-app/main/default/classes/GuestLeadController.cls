/**
 * ------------------------------------------------------------------------------
 * @description     Controller for creating, updating, and retrieving Lead records
 * @author          Hrishika
 * @date            03-Nov-2025
 * @version         1.1
 * 
 * @scope           Designed for guest user operations within Experience Cloud
 * @notes           Includes field-level handling for:
 *                  Channel__c, Title, Geography__c, Direct_Indirect__c,
 *                  Business_Type__c, Contact_type__c, Status, Phone, Rating, Email
 * 
 * @security        Runs without sharing — ensure FLS & CRUD enforcement in LWC/Aura
 * ------------------------------------------------------------------------------
 */
public without sharing class GuestLeadController {

    // List of fields allowed to be modified/created
    private static final List<String> ALLOWED_FIELDS = new List<String>{
        'Channel__c', 'Title', 'Geography__c', 'Direct_Indirect__c',
        'Business_Type__c', 'Contact_type__c', 'Status',
        'Phone', 'Rating', 'Email', 'LastName', 'Company'
    };

    // ------------------------- CREATE LEAD -------------------------
    @AuraEnabled
    public static String createLead(Map<String, Object> leadData) {
        try {
            validateRequiredFields(leadData);

            Lead newLead = new Lead();

            for (String fieldName : leadData.keySet()) {
                if (ALLOWED_FIELDS.contains(fieldName)) {
                    Object val = leadData.get(fieldName);
                    if (val != null && String.valueOf(val).trim() != '') {
                        newLead.put(fieldName, val);
                    }
                }
            }

            // Default fallback values
            if (String.isBlank(newLead.Status)) {
                newLead.Status = 'Open - Not Contacted';
            }
            if (String.isBlank(newLead.Company)) {
                newLead.Company = 'Not Provided';
            }

            insert newLead;
            return newLead.Id;

        } catch (Exception e) {
            throw new AuraHandledException('Lead creation failed: ' + e.getMessage());
        }
    }

    // ------------------------- UPDATE LEAD -------------------------
    @AuraEnabled
    public static String updateLead(String leadId, Map<String, Object> leadData) {
        if (String.isBlank(leadId)) {
            throw new AuraHandledException('Lead Id is required');
        }

        try {
            Lead existingLead = [
                SELECT Id FROM Lead WHERE Id = :leadId LIMIT 1
            ];

            for (String fieldName : leadData.keySet()) {
                if (ALLOWED_FIELDS.contains(fieldName)) {
                    Object val = leadData.get(fieldName);
                    if (val != null && String.valueOf(val).trim() != '') {
                        existingLead.put(fieldName, val);
                    }
                }
            }

            update existingLead;
            return 'Lead updated successfully';

        } catch (QueryException qe) {
            throw new AuraHandledException('Lead not found');
        } catch (DmlException de) {
            throw new AuraHandledException('Lead update failed: ' + de.getDmlMessage(0));
        } catch (Exception e) {
            throw new AuraHandledException('Unexpected error: ' + e.getMessage());
        }
    }

    // ------------------------- GET LEAD BY ID -------------------------
    @AuraEnabled(cacheable=true)
    public static Lead getLeadById(String leadId) {
        if (String.isBlank(leadId)) {
            throw new AuraHandledException('Lead Id is required');
        }

        try {
            return [
                SELECT Id, Channel__c, Title, Geography__c, Direct_Indirect__c,
                       Business_Type__c, Contact_type__c, Status,
                       Phone, Rating, Email, LastName, Company
                FROM Lead
                WHERE Id = :leadId
                LIMIT 1
            ];
        } catch (QueryException qe) {
            throw new AuraHandledException('Lead not found');
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Lead: ' + e.getMessage());
        }
    }

    // ------------------------- VALIDATION HELPERS -------------------------
    private static void validateRequiredFields(Map<String, Object> leadData) {
        if (String.isBlank(String.valueOf(leadData.get('LastName')))) {
            throw new AuraHandledException('Last Name is required');
        }
        if (String.isBlank(String.valueOf(leadData.get('Company')))) {
            throw new AuraHandledException('Company is required');
        }

        if (leadData.containsKey('Email') && String.isNotBlank(String.valueOf(leadData.get('Email')))) {
            String emailValue = String.valueOf(leadData.get('Email'));
            if (!isValidEmail(emailValue)) {
                throw new AuraHandledException('Invalid email format');
            }
        }
    }

    private static Boolean isValidEmail(String email) {
        Pattern pattern = Pattern.compile('^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
        Matcher matcher = pattern.matcher(email);
        return matcher.matches();
    }
}
