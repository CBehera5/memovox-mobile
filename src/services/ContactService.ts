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
   */
  async findMemoVoxUsers(contacts: Contacts.Contact[]): Promise<ContactMatch[]> {
    // 1. Extract and normalize all phone numbers from contacts
    const phoneMap = new Map<string, Contacts.Contact>();
    const allPhones: string[] = [];

    contacts.forEach(contact => {
      contact.phoneNumbers?.forEach(pn => {
        const normalized = this.normalizePhoneNumber(pn.number || '');
        if (normalized.length > 5) { // Basic validation
          phoneMap.set(normalized, contact);
          allPhones.push(normalized);
        }
      });
    });

    if (allPhones.length === 0) return [];

    try {
      // 2. Query Supabase for these phone numbers
      // We process in chunks if too many, but for now 1 query
      // Important: RLS must allow seeing basic profile info if needed, or we use a secure RPC.
      // For MVP, we assume profiles are public or we use anon key.
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number')
        .in('phone_number', allPhones);

      if (error) throw error;

      // 3. Match results back to contacts
      const matches: ContactMatch[] = [];
      const registeredPhones = new Set(data?.map(p => p.phone_number));

      // Add registered users
      data?.forEach(user => {
         const contact = phoneMap.get(user.phone_number);
         if (contact) {
           matches.push({
             contactId: contact.id,
             name: contact.name, // Use contact name from phone book for familiarity
             phoneNumber: user.phone_number,
             isRegistered: true,
             userId: user.id
           });
         }
      });

      // Add non-registered users (up to a limit or all)
      // For privacy/performance, we might only return registered ones, but user wants to invite friends.
      contacts.forEach(contact => {
        const phone = contact.phoneNumbers?.[0]?.number;
        const normalized = this.normalizePhoneNumber(phone || '');
        
        if (phone && !registeredPhones.has(normalized)) {
          // Avoid duplicates if same contact has multiple numbers check
           const alreadyAdded = matches.find(m => m.contactId === contact.id);
           if (!alreadyAdded) {
             matches.push({
               contactId: contact.id,
               name: contact.name,
               phoneNumber: phone,
               isRegistered: false
             });
           }
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
