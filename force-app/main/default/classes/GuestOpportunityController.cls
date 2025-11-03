/**
 * @description Controller for creating and updating Opportunity records
 */
public without sharing class GuestOpportunityController {
    
    @AuraEnabled
    public static String createOpportunity(Map<String, Object> oppData) {
        try {
            validateRequiredFields(oppData);
            
            Opportunity newOpp = new Opportunity();
            
            for (String fieldName : oppData.keySet()) {
                Object fieldValue = oppData.get(fieldName);
                if (fieldValue != null && String.valueOf(fieldValue).trim() != '') {
                    if (fieldName == 'CloseDate') {
                        newOpp.CloseDate = Date.valueOf(String.valueOf(fieldValue));
                    } else {
                        newOpp.put(fieldName, fieldValue);
                    }
                }
            }
            
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
            
            for (String fieldName : oppData.keySet()) {
                Object fieldValue = oppData.get(fieldName);
                if (fieldValue != null) {
                    if (fieldName == 'CloseDate') {
                        existingOpp.CloseDate = Date.valueOf(String.valueOf(fieldValue));
                    } else {
                        existingOpp.put(fieldName, fieldValue);
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
    
    @AuraEnabled(cacheable=true)
    public static Opportunity getOpportunityById(String oppId) {
        try {
            if (String.isBlank(oppId)) {
                throw new AuraHandledException('Opportunity Id is required');
            }
            
            return [
                SELECT Id, Name, AccountId, Amount, CloseDate, StageName, 
                       Probability, Type, LeadSource, NextStep, Description
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
                Map<String, String> accMap = new Map<String, String>();
                accMap.put('value', acc.Id);
                accMap.put('label', acc.Name);
                accountList.add(accMap);
            }
            
            return accountList;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error: ' + e.getMessage());
        }
    }
    
    private static void validateRequiredFields(Map<String, Object> oppData) {
        if (!oppData.containsKey('Name') || 
            String.isBlank(String.valueOf(oppData.get('Name')))) {
            throw new AuraHandledException('Opportunity Name is required');
        }
        
        if (!oppData.containsKey('CloseDate') || 
            oppData.get('CloseDate') == null) {
            throw new AuraHandledException('Close Date is required');
        }
        
        if (!oppData.containsKey('StageName') || 
            String.isBlank(String.valueOf(oppData.get('StageName')))) {
            throw new AuraHandledException('Stage is required');
        }
    }
}