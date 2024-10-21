const fetch = require('node-fetch');
//const hubspot = require('@hubspot/api-client');

exports.main = async (event) => {
  const token = '######' // Secret Token
  const dealId = event.object.objectId;

  try {
    if (dealId) {
      // Fetch associated contact
      const contactResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contact`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const contactData = await contactResponse.json();

      console.log('contactData:', contactData); // Log the contactData object

      // Check if results array exists and is not empty
      if (contactData.results && contactData.results.length > 0) {
        const contactId = contactData.results[0].id;

        // Fetch contact properties
        const propertiesResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=varieties,seed_unit,seed_treatment,n2nd_seed_variety,n2nd_seed_unit,n2nd_seed_unit_price,third_seed_variety,third_variety_seed_units,n4th_variety_selected,n4th_seed_units,n4th_variety_seed_price,n5th_variety_selected,n5th_seed_units,n5th_seed_price_`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const propertiesData = await propertiesResponse.json();

        // Access properties correctly from propertiesData.properties for the first line item
        const varieties = propertiesData.properties.varieties;
        const seedUnit = propertiesData.properties.seed_unit;
        const seed_treatment = propertiesData.properties.seed_treatment;

        // Log individual property values
        console.log('Varieties:', varieties);
        console.log('Seed Units:', seedUnit);
        console.log('Seed Treatment:', seed_treatment);

        // Construct the lineItems array
        const lineItems = [];

        // First Line Item (always created)
        lineItems.push({
          properties: {
            name: varieties.value,
            quantity: seedUnit.value,
            seed_treatment: seed_treatment.value === 'Treated Seed' ? 'Treated' : 'Untreated',
          },
          associations: [
            {
              to: {
                id: dealId,
              },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 20,
                },
              ],
            },
          ],
        });
      // Second Line Item (if n2nd_seed_variety exists)
      if (propertiesData.properties.n2nd_seed_variety && propertiesData.properties.n2nd_seed_variety.value) {
        lineItems.push({
          properties: {
            name: propertiesData.properties.n2nd_seed_variety.value,
            quantity: propertiesData.properties.n2nd_seed_unit ? propertiesData.properties.n2nd_seed_unit.value : null, // Set quantity if available
          },
          associations: [
            {
              to: {
                id: dealId,
              },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 20,
                },
              ],
            },
          ],
        });
      }

      // Third Line Item (if third_seed_variety exists)
      if (propertiesData.properties.third_seed_variety && propertiesData.properties.third_seed_variety.value) {
        lineItems.push({
          properties: {
            name: propertiesData.properties.third_seed_variety.value,
            quantity: propertiesData.properties.third_variety_seed_units ? propertiesData.properties.third_variety_seed_units.value : null, // Set quantity if available
          },
          associations: [
            {
              to: {
                id: dealId,
              },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 20,
                },
              ],
            },
          ],
        });
      }

      // Fourth Line Item (if n4th_variety_selected exists)
      if (propertiesData.properties.n4th_variety_selected && propertiesData.properties.n4th_variety_selected.value) {
        lineItems.push({
          properties: {
            name: propertiesData.properties.n4th_variety_selected.value,
            quantity: propertiesData.properties.n4th_seed_units ? propertiesData.properties.n4th_seed_units.value : null, // Set quantity if available
          },
          associations: [
            {
              to: {
                id: dealId,
              },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 20,
                },
              ],
            },
          ],
        });
      }

      // Fifth Line Item (if n5th_variety_selected exists)
      if (propertiesData.properties.n5th_variety_selected && propertiesData.properties.n5th_variety_selected.value) {
        lineItems.push({
          properties: {
            name: propertiesData.properties.n5th_variety_selected.value,
            quantity: propertiesData.properties.n5th_seed_units ? propertiesData.properties.n5th_seed_units.value : null, // Set quantity if available
          },
          associations: [
            {
              to: {
                id: dealId,
              },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 20,
                },
              ],
            },
          ],
        });
      }
        
        // Create line items in HubSpot using batchApi.create
        if (lineItems.length > 0) {
          const createLineItemsResponse = await fetch('https://api.hubapi.com/crm/v3/objects/line_items/batch/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ inputs: lineItems }),
          });

          if (!createLineItemsResponse.ok) {
            const responseBody = await createLineItemsResponse.text();
            throw new Error(`Failed to create line items: ${createLineItemsResponse.status} ${createLineItemsResponse.statusText}\nResponse Body: ${responseBody}`);
          }
        }
      } else {
        console.warn('No associated contact found for this deal.');
        // Handle the case where there's no associated contact
        // You might want to skip line item creation or perform a different action
      }
    } else {
      console.error('Deal ID not found in the event object.');
    }
  } catch (error) {
    console.error(error);
  }
};
