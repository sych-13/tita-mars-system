# Future feature: distance-based delivery fees

## Status

Planning only. The current system still uses the configured fixed delivery fee.

## Goal

Calculate a delivery fee based on the distance between the Tita Mars store and the customer's delivery location.

## Proposed pricing rule

- Up to and including 2 km: use the regular configured delivery fee.
- More than 2 km: add ₱5 to the regular delivery fee.
- Example: regular fee ₱20 + ₱5 surcharge = ₱25.

The owner should be able to change the base fee and surcharge later from store settings.

## Customer checkout flow

1. Customer chooses **Delivery** at checkout.
2. Customer enters an address or selects a location pin on a map.
3. The system converts the selected location into coordinates.
4. Checkout displays the estimated distance and calculated delivery fee.
5. Customer reviews the final total before placing the order.
6. The order stores the confirmed distance, base fee, surcharge, and final delivery fee.

## Location options

### Recommended for the first version

- Let the customer enter an address and optionally select a map pin.
- Use straight-line distance (Haversine calculation) for a low-cost estimate.
- Keep a manual address fallback when location permission is denied.

### More accurate option

- Use a road-distance service such as Google Maps Routes API.
- This provides driving distance, but may require API billing, quotas, and a secure API key setup.

## Security requirements

- Customer-side JavaScript should only show an estimate.
- The final distance and fee must be recalculated in a trusted backend or protected transaction.
- Customers must not be allowed to submit their own delivery fee or distance.
- Save the fee snapshot on the order so later settings changes do not alter old orders.
- Validate that the destination remains within the supported Taytay/Cainta service area.

## Required order fields

```text
deliveryLatitude
deliveryLongitude
deliveryDistanceKm
deliveryBaseFee
deliverySurcharge
deliveryFee
distanceMethod
```

`distanceMethod` can identify whether the value came from a map pin, straight-line estimate, or road-distance provider.

## Edge cases

- Location permission denied.
- Address cannot be geocoded.
- Customer selects a location outside Taytay or Cainta.
- Customer moves the map pin after the fee is calculated.
- Distance is exactly 2 km.
- Temporary map/API outage.
- Suspicious or impossible coordinates.

## Recommended rollout

1. Add map-pin selection and manual fallback.
2. Add straight-line distance calculation and fee preview.
3. Move final calculation into a trusted backend/transaction.
4. Add owner settings for threshold, surcharge, and service area.
5. Consider road-distance API only if the estimate is not accurate enough.

## Important limitation

This feature does not automatically verify that a delivery was completed. It only calculates the delivery charge. Delivery OTP confirmation remains a separate handoff feature.
