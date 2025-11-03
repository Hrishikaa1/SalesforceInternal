/**
 * ------------------------------------------------------------------------------
 * @description     Controller for creating, updating, and retrieving Opportunity records.
 * @author          Hrishika
 * @date            03-Nov-2025
 * @version         1.0
 * 
 * @scope           Designed for Experience Cloud guest users to manage Opportunity data.
 * @notes           Includes only required and allowed fields for safe guest-level operations:
 *                  - AccountId
 *                  - Name
 *                  - StageName
 *                  - CloseDate
 *                  - Description
 *                  - Amount
 *                  - Probability
 *                  - Type
 *                  - ContactId
 *                  - Opportunity_Type__c
 *                  - Channel__c
 *                  - Geography__c
 *                  - Direct_Indirect__c
 *                  - Business_Type__c
 *                  - Contact_type__c
 *                  - FY_Goals__c
 *                  - Project_Code__c
 *                  - Type_of_Engagement__c
 *                  - End_Date__c
 *                  - Start_Date__c
 *                  - Number_of_Resources__c
 *                  - Offering__c
 * 
 * @security        Runs without sharing — enforce FLS & CRUD via LWC or Aura component.
 * ------------------------------------------------------------------------------
 */

public without sharing class GuestOpportunityController {

    /**
     * @description Creates a new Opportunity record with limited field exposure.
     * @param oppData   Map of Opportunity field API names to their values.
     * @return          String - Newly created Opportunity Id.
     */
    @AuraEnabled
    public static String createOpportunity(Map<String, Object> oppData) {
        try {
            // Validate mandatory inputs
            validateRequiredFields(oppData);

            Opportunity newOpp = new Opportunity();

            // Whitelisted fields for guest users
            List<String> allowedFields = new List<String>{
                'AccountId', 'Name', 'Description', 'StageName', 'Amount', 'Probability',
                'CloseDate', 'Type', 'ContactId', 'Opportunity_Type__c', 'Channel__c',
                'Geography__c', 'Direct_Indirect__c', 'Business_Type__c', 'Contact_type__c',
                'FY_Goals__c', 'Project_Code__c', 'Type_of_Engagement__c', 'End_Date__c',
                'Start_Date__c', 'Number_of_Resources__c', 'Offering__c'
            };

            // Dynamic population of allowed fields
            for (String fieldName : oppData.keySet()) {
                if (allowedFields.contains(fieldName)) {
                    Object fieldValue = oppData.get(fieldName);
                    if (fieldValue != null && String.valueOf(fieldValue).trim() != '') {
                        if (fieldName == 'CloseDate') {
                            newOpp.CloseDate = Date.valueOf(String.valueOf(fieldValue));
                        } else {
                            newOpp.put(fieldName, fieldValue);
                        }
                    }
                }
            }

            // Set default StageName if not provided
            if (newOpp.StageName == null) {
                newOpp.StageName = 'Prospecting';
            }

            insert newOpp;
            return newOpp.Id;

        } catch (DmlException e) {
            throw new AuraHandledException('Error creating Opportunity: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }

    /**
     * @description Updates an existing Opportunity record safely.
     * @param oppId     Id of the Opportunity record to update.
     * @param oppData   Map of field API names and values to update.
     * @return          String - Confirmation message.
     */
    @AuraEnabled
    public static String updateOpportunity(String oppId, Map<String, Object> oppData) {
        try {
            if (String.isBlank(oppId)) {
                throw new AuraHandledException('Opportunity Id is required');
            }

            Opportunity existingOpp = [
                SELECT Id 
                FROM Opportunity 
                WHERE Id = :oppId 
                LIMIT 1
            ];

            List<String> allowedFields = new List<String>{
                'AccountId', 'Name', 'Description', 'StageName', 'Amount', 'Probability',
                'CloseDate', 'Type', 'ContactId', 'Opportunity_Type__c', 'Channel__c',
                'Geography__c', 'Direct_Indirect__c', 'Business_Type__c', 'Contact_type__c',
                'FY_Goals__c', 'Project_Code__c', 'Type_of_Engagement__c', 'End_Date__c',
                'Start_Date__c', 'Number_of_Resources__c', 'Offering__c'
            };

            for (String fieldName : oppData.keySet()) {
                if (allowedFields.contains(fieldName)) {
                    Object fieldValue = oppData.get(fieldName);
                    if (fieldValue != null && String.valueOf(fieldValue).trim() != '') {
                        if (fieldName == 'CloseDate') {
                            existingOpp.CloseDate = Date.valueOf(String.valueOf(fieldValue));
                        } else {
                            existingOpp.put(fieldName, fieldValue);
                        }
                    }
                }
            }

            update existingOpp;
            return 'Opportunity updated successfully';

        } catch (QueryException e) {
            throw new AuraHandledException('Opportunity not found');
        } catch (DmlException e) {
            throw new AuraHandledException('Error updating Opportunity: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }

    /**
     * @description Fetches a specific Opportunity record by Id with limited fields.
     * @param oppId  Opportunity Id.
     * @return       Opportunity record.
     */
    @AuraEnabled(cacheable=true)
    public static Opportunity getOpportunityById(String oppId) {
        try {
            if (String.isBlank(oppId)) {
                throw new AuraHandledException('Opportunity Id is required');
            }

            return [
                SELECT Id, AccountId, Name, Description, StageName, Amount, Probability,
                       CloseDate, Type, ContactId, Opportunity_Type__c, Channel__c,
                       Geography__c, Direct_Indirect__c, Business_Type__c, Contact_type__c,
                       FY_Goals__c, Project_Code__c, Type_of_Engagement__c, End_Date__c,
                       Start_Date__c, Number_of_Resources__c, Offering__c
                FROM Opportunity 
                WHERE Id = :oppId 
                LIMIT 1
            ];

        } catch (QueryException e) {
            throw new AuraHandledException('Opportunity not found');
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }

    /**
     * @description Search helper to fetch Account records by name (for Account lookup).
     * @param searchTerm Partial or full Account Name.
     * @return           List of Account Id/Name pairs for UI lookup.
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAccounts(String searchTerm) {
        try {
            String searchKey = '%' + searchTerm + '%';
            List<Account> accounts = [
                SELECT Id, Name
                FROM Account
                WHERE Name LIKE :searchKey
                LIMIT 10
            ];

            List<Map<String, String>> accountList = new List<Map<String, String>>();
            for (Account acc : accounts) {
                accountList.add(new Map<String, String>{
                    'value' => acc.Id,
                    'label' => acc.Name
                });
            }

            return accountList;

        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }

    /**
     * @description Validates key required fields for Opportunity creation/update.
     * @param oppData Map of Opportunity data.
     */
    private static void validateRequiredFields(Map<String, Object> oppData) {
        if (!oppData.containsKey('Name') || String.isBlank(String.valueOf(oppData.get('Name')))) {
            throw new AuraHandledException('Opportunity Name is required');
        }

        if (!oppData.containsKey('CloseDate') || oppData.get('CloseDate') == null) {
            throw new AuraHandledException('Close Date is required');
        }

        if (!oppData.containsKey('StageName') || String.isBlank(String.valueOf(oppData.get('StageName')))) {
            throw new AuraHandledException('Stage is required');
        }

        if (!oppData.containsKey('AccountId') || String.isBlank(String.valueOf(oppData.get('AccountId')))) {
            throw new AuraHandledException('Account is required');
        }
    }
}
