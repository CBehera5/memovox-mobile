import * as Contacts from 'expo-contacts';
import { supabase } from '../config/supabase';

export interface ContactMatch {
  contactId: string;
  name: string;
  phoneNumber: string;
  isRegistered: boolean;
  userId?: string; // MemoVox User ID if registered
}

class ContactService {
  /**
   * Request permission and fetch contacts
   */
  async getContacts(): Promise<Contacts.Contact[]> {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });
        
        // Filter contacts with phone numbers
        return data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
      }
      return [];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  }

  /**
   * Normalize phone number to E.164-ish format for matching
   * Removes spaces, dashes, parentheses.
   */
  normalizePhoneNumber(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Find which contacts are registered on MemoVox
   * Uses fuzzy matching (last 10 digits) to handle formatting differences.
   */
  async findMemoVoxUsers(contacts: Contacts.Contact[]): Promise<ContactMatch[]> {
    // 1. Prepare local phone map for fast lookup
    // Map last 10 digits -> Contact
    const phoneMap = new Map<string, Contacts.Contact>();
    const allPhones: string[] = [];

    contacts.forEach(contact => {
      contact.phoneNumbers?.forEach(pn => {
        // Remove all non-digits
        const digits = (pn.number || '').replace(/\D/g, '');
        // Keep last 10 digits for matching (ignoring country code for now)
        if (digits.length >= 10) {
            const last10 = digits.slice(-10);
            phoneMap.set(last10, contact);
            allPhones.push(last10);
        }
      });
    });

    if (allPhones.length === 0) return [];

    try {
      // 2. Query Supabase for ALL profiles with phone numbers (RLS allows select true)
      // Note: In a large app, we would send the hash of phones or use an RPC.
      // For now (MVP), we fetch profiles and match locally to ensure "friends" are found.
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number')
        .neq('phone_number', null)
        .neq('phone_number', ''); // Filter empty strings too

      if (error) throw error;

      // 3. Match results back to contacts
      const matches: ContactMatch[] = [];
      const registeredIds = new Set<string>();

      // Check each DB user against local contact map
      data?.forEach(user => {
         if (!user.phone_number) return;
         
         const userDigits = user.phone_number.replace(/\D/g, '');
         // Try matching last 10 digits (most common)
         if (userDigits.length >= 10) {
             const userLast10 = userDigits.slice(-10);
             const contact = phoneMap.get(userLast10);
             
             if (contact) {
                 console.log(`Matched Contact: ${contact.name} with App User: ${user.full_name}`);
                 matches.push({
                     contactId: contact.id,
                     name: contact.name, // Use contact name from phone book
                     phoneNumber: user.phone_number,
                     isRegistered: true,
                     userId: user.id
                 });
                 registeredIds.add(contact.id);
             }
         }
      });

      // 4. Add non-registered users (Invites)
      // Only add if not already matched as registered
      contacts.forEach(contact => {
        if (registeredIds.has(contact.id)) return;
        
        const phone = contact.phoneNumbers?.[0]?.number;
        if (phone) {
             matches.push({
               contactId: contact.id,
               name: contact.name,
               phoneNumber: phone,
               isRegistered: false
             });
        }
      });

      // Sort: Registered first, then alphabetical
      return matches.sort((a, b) => {
        if (a.isRegistered && !b.isRegistered) return -1;
        if (!a.isRegistered && b.isRegistered) return 1;
        return a.name.localeCompare(b.name);
      });

    } catch (error) {
      console.error('Error matching contacts:', error);
      return [];
    }
  }
}

export default new ContactService();
