public without sharing class GuestLeadController {

    // ------------------------- GET ALL LEADS (SITE-BASED FILTER) -------------------------
    @AuraEnabled(cacheable=true)
    public static List<Lead> getLeads() {
        try {
            String siteName = getCurrentSiteName();

            return [
                SELECT Id, LastName, Company, Email, Phone, Status, Rating, Submitted_by__c
                FROM Lead
                WHERE Submitted_by__c = :siteName
                ORDER BY CreatedDate DESC
                LIMIT 200
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving leads: ' + e.getMessage());
        }
    }

    // ------------------------- ALLOWED FIELDS -------------------------
    private static final List<String> ALLOWED_FIELDS = new List<String>{
        'Salutation',
        'FirstName',
        'LastName',
        'Company',
        'Title',
        'Email',
        'Phone',
        'Status',
        'Rating',
        'Channel__c',
        'Geography__c',
        'Direct_Indirect__c',
        'Business_Type__c',
        'Contact_type__c',
        'Submitted_by__c',
        'LeadSource'
    };

    // ------------------------- CREATE LEAD -------------------------
    @AuraEnabled
    public static String createLead(Map<String, Object> leadData) {
        try {
            validateRequiredFields(leadData);

            Lead newLead = new Lead();

            // Set allowed fields from UI
            for (String fieldName : leadData.keySet()) {
                if (ALLOWED_FIELDS.contains(fieldName)) {
                    Object val = leadData.get(fieldName);
                    if (val != null && String.valueOf(val).trim() != '') {
                        newLead.put(fieldName, val);
                    }
                }
            }

            // Always override "Submitted_by__c" with current site name
            String siteName = getCurrentSiteName();
            newLead.Submitted_by__c = siteName;

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
                SELECT Id, Submitted_by__c FROM Lead WHERE Id = :leadId LIMIT 1
            ];

            // Prevent editing leads from **another site**
            String siteName = getCurrentSiteName();
            if (existingLead.Submitted_by__c != siteName) {
                throw new AuraHandledException('You can only edit records submitted from this site.');
            }

            // Apply allowed updates (never allow Submitted_by__c to be changed)
            for (String fieldName : leadData.keySet()) {
                if (ALLOWED_FIELDS.contains(fieldName) && fieldName != 'Submitted_by__c') {
                    Object val = leadData.get(fieldName);
                    if (val != null && String.valueOf(val).trim() != '') {
                        existingLead.put(fieldName, val);
                    } else {
                        // if empty string/null provided, explicitly set null for that field
                        existingLead.put(fieldName, null);
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
            Lead l = [
                SELECT Id,
                       Salutation,
                       FirstName,
                       LastName,
                       Company,
                       Title,
                       Email,
                       Phone,
                       Status,
                       Rating,
                       Channel__c,
                       Geography__c,
                       Direct_Indirect__c,
                       Business_Type__c,
                       Contact_type__c,
                       Submitted_by__c,
                       LeadSource
                FROM Lead
                WHERE Id = :leadId
                LIMIT 1
            ];

            // Prevent viewing other site's leads
            String siteName = getCurrentSiteName();
            if (l.Submitted_by__c != siteName) {
                throw new AuraHandledException('You do not have permission to view this record.');
            }

            return l;

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

    // ------------------------- GET PICKLIST VALUES -------------------------
    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getLeadPicklistValues() {
        Map<String, List<String>> picklistMap = new Map<String, List<String>>();

        List<String> fields = new List<String>{
            'Salutation',
            'Channel__c',
            'Geography__c',
            'Direct_Indirect__c',
            'Business_Type__c',
            'Contact_type__c',
            'Submitted_by__c',
            'LeadSource',
            'Rating',
            'Status'
        };

        Schema.DescribeSObjectResult leadDescribe = Lead.SObjectType.getDescribe();
        Map<String, Schema.SObjectField> fieldMap = leadDescribe.fields.getMap();

        for (String fieldName : fields) {
            if (fieldMap.containsKey(fieldName)) {
                Schema.DescribeFieldResult fieldResult = fieldMap.get(fieldName).getDescribe();
                List<String> values = new List<String>();

                for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
                    if (entry.isActive()) values.add(entry.getLabel());
                }

                picklistMap.put(fieldName, values);
            }
        }

        return picklistMap;
    }

    // ------------------------- SITE HELPER -------------------------
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
            currentSiteName = n.Name;   // FIXED
        } else {
            currentSiteName = 'Default Site';
        }
    } catch (Exception ex) {
        currentSiteName = 'Default Site';
    }

    return currentSiteName;
}

}