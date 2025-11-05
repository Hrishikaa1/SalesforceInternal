/**
 * ------------------------------------------------------------------------------
 * @description     Controller for creating, updating, and retrieving Contact records
 * @author          Hrishika
 * @date            05-Nov-2025
 * @version         1.0
 * @scope           Guest user operations (Experience Cloud)
 * ------------------------------------------------------------------------------
 */
public without sharing class GuestContactController {

    private static final List<String> ALLOWED_FIELDS = new List<String>{
        'LastName', 'Email', 'Phone', 'MobilePhone', 'Contact_type__c'
        // Note: 'Id' is not needed in create/update payload
    };

    // ------------------------- CREATE CONTACT -------------------------
    @AuraEnabled
    public static String createContact(Map<String, Object> contactData) {
        try {
            validateRequiredFields(contactData);

            Contact newCon = new Contact();

            for (String field : contactData.keySet()) {
                if (ALLOWED_FIELDS.contains(field)) {
                    Object val = contactData.get(field);
                    if (val != null && String.valueOf(val).trim() != '') {
                        newCon.put(field, val);
                    }
                }
            }

            insert newCon;
            return newCon.Id;

        } catch (Exception e) {
            throw new AuraHandledException('Contact creation failed: ' + e.getMessage());
        }
    }

    // ------------------------- UPDATE CONTACT -------------------------
    @AuraEnabled
    public static String updateContact(String contactId, Map<String, Object> contactData) {
        if (String.isBlank(contactId)) {
            throw new AuraHandledException('Contact Id is required');
        }

        try {
            Contact con = [SELECT Id FROM Contact WHERE Id = :contactId LIMIT 1];

            for (String field : contactData.keySet()) {
                if (ALLOWED_FIELDS.contains(field)) {
                    Object val = contactData.get(field);
                    if (val != null && String.valueOf(val).trim() != '') {
                        con.put(field, val);
                    }
                }
            }

            update con;
            return 'Contact updated successfully';

        } catch (QueryException qe) {
            throw new AuraHandledException('Contact not found');
        } catch (Exception e) {
            throw new AuraHandledException('Unexpected error: ' + e.getMessage());
        }
    }

    // ------------------------- GET CONTACT BY ID -------------------------
    @AuraEnabled(cacheable=true)
    public static Contact getContactById(String contactId) {
        if (String.isBlank(contactId)) {
            throw new AuraHandledException('Contact Id is required');
        }

        try {
            return [
                SELECT Id, LastName, Email, Phone, MobilePhone, Contact_type__c
                FROM Contact
                WHERE Id = :contactId
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Contact: ' + e.getMessage());
        }
    }

    // ------------------------- GET ALL CONTACTS (DATATABLE) -------------------------
    @AuraEnabled(cacheable=true)
    public static List<Contact> getContacts() {
        try {
            return [
                SELECT Id, Name, Email, Phone, MobilePhone, Contact_type__c
                FROM Contact
                ORDER BY CreatedDate DESC
                LIMIT 200
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving contacts: ' + e.getMessage());
        }
    }

    // ------------------------- VALIDATION -------------------------
    private static void validateRequiredFields(Map<String, Object> data) {
        if (String.isBlank(String.valueOf(data.get('LastName')))) {
            throw new AuraHandledException('Last Name is required');
        }
        if (data.containsKey('Email') && String.isNotBlank(String.valueOf(data.get('Email')))) {
            String email = String.valueOf(data.get('Email'));
            if (!Pattern.matches('^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$', email)) {
                throw new AuraHandledException('Invalid email format');
            }
        }
    }
}