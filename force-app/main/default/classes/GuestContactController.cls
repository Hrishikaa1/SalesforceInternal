public without sharing class GuestContactController {

    // ------------------------- ALLOWED FIELDS -------------------------
    private static final List<String> ALLOWED_FIELDS = new List<String>{
        'AccountId', 'LastName', 'Email', 'Phone', 'MobilePhone', 'Contact_type__c', 'Submitted_by__c'
    };

    // ------------------------- CREATE CONTACT -------------------------
    @AuraEnabled
    public static String createContact(Map<String, Object> contactData) {
        try {
            validateRequiredFields(contactData);

            Contact newCon = new Contact();

            // Set all allowed fields including Submitted_by__c
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
            Contact con = [
                SELECT Id, Submitted_by__c
                FROM Contact
                WHERE Id = :contactId
                LIMIT 1
            ];

            String siteName = getCurrentSiteName();

            // 🔥 Prevent editing someone else's record
            if (con.Submitted_by__c != siteName) {
                throw new AuraHandledException('You cannot edit this contact.');
            }

            for (String field : contactData.keySet()) {
                if (ALLOWED_FIELDS.contains(field)) {
                    Object val = contactData.get(field);

                    if (val != null && String.valueOf(val).trim() != '') {
                        con.put(field, val);
                    } else {
                        con.put(field, null);
                    }
                }
            }

            update con;
            return 'Contact updated successfully';

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
            Contact c = [
                SELECT Id, AccountId, LastName, Email, Phone, MobilePhone,
                       Contact_type__c, Submitted_by__c, Account.Name
                FROM Contact
                WHERE Id = :contactId
                LIMIT 1
            ];

            // 🔥 Prevent access to other site's records
            if (c.Submitted_by__c != getCurrentSiteName()) {
                throw new AuraHandledException('Not authorized to view this contact.');
            }

            return c;

        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Contact: ' + e.getMessage());
        }
    }

    // ------------------------- GET CONTACT LIST (SITE FILTERED) -------------------------
    @AuraEnabled(cacheable=true)
    public static List<Contact> getContacts() {
        try {
            String siteName = getCurrentSiteName();

            return [
                SELECT Id, Name, Email, Phone, MobilePhone, Contact_type__c, Submitted_by__c
                FROM Contact
                WHERE Submitted_by__c = :siteName
                ORDER BY CreatedDate DESC
                LIMIT 200
            ];

        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving contacts: ' + e.getMessage());
        }
    }

    // ------------------------- ACCOUNT LOOKUP (SITE FILTERED) -------------------------
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAccounts(String searchTerm) {
        String search = '%' + (searchTerm == null ? '' : searchTerm.trim()) + '%';
        String siteName = getCurrentSiteName();

        List<Map<String, String>> results = new List<Map<String, String>>();

        for (Account a : [
            SELECT Id, Name, Submitted_by__c
            FROM Account
            WHERE Submitted_by__c = :siteName
              AND Name LIKE :search
            LIMIT 10
        ]) {
            results.add(new Map<String, String>{
                'value' => a.Id,
                'label' => a.Name
            });
        }

        return results;
    }

    // ------------------------- GET PICKLIST VALUES -------------------------
    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getContactPicklistValues() {
        Map<String, List<String>> picklistMap = new Map<String, List<String>>();

        try {
            // Get Contact_type__c picklist values
            Schema.DescribeFieldResult contactTypeField = Contact.Contact_type__c.getDescribe();
            List<String> contactTypeValues = new List<String>();
            for (Schema.PicklistEntry entry : contactTypeField.getPicklistValues()) {
                if (entry.isActive()) contactTypeValues.add(entry.getValue());
            }
            picklistMap.put('Contact_type__c', contactTypeValues);

            // Get Submitted_by__c picklist values
            Schema.DescribeFieldResult submittedByField = Contact.Submitted_by__c.getDescribe();
            List<String> submittedByValues = new List<String>();
            for (Schema.PicklistEntry entry : submittedByField.getPicklistValues()) {
                if (entry.isActive()) submittedByValues.add(entry.getValue());
            }
            picklistMap.put('Submitted_by__c', submittedByValues);

        } catch (Exception e) {
            System.debug('Error getting picklist values: ' + e.getMessage());
        }

        return picklistMap;
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

    // ------------------------- SITE NAME HELPER -------------------------
    private static String currentSiteName;

    private static String getCurrentSiteName() {
        if (currentSiteName != null) return currentSiteName;

        try {
            Id netId = Network.getNetworkId();
            if (netId != null) {
                Network n = [
                    SELECT Id, Name
                    FROM Network
                    WHERE Id = :netId
                    LIMIT 1
                ];
                currentSiteName = n.Name;
            } else {
                currentSiteName = 'Default Site';
            }
        } catch (Exception e) {
            currentSiteName = 'Default Site';
        }

        return currentSiteName;
    }
}