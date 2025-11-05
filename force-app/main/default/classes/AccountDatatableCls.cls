
/**
 * ------------------------------------------------------------------------------
 * @description     Controller for retrieving Lead records for datatable
 * @author          Hrishika
 * @date            03-Nov-2025
 * @version         1.2
 * ------------------------------------------------------------------------------
 */
public without sharing class AccountDatatableCls {
    
    @AuraEnabled(cacheable=true)
    public static List<Lead> getLeads() {
        try {
            return [
                SELECT Id, LastName, Email, Phone, Contact_type__c
                FROM Lead 
                ORDER BY CreatedDate DESC 
                LIMIT 200
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving leads: ' + e.getMessage());
        }
    }

    
}