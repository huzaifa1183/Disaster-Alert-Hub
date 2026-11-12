export const weatherLocations = [
  { id: 'mumbai', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777, isDefault: true },
  { id: 'delhi', city: 'New Delhi', district: 'New Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { id: 'bengaluru', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { id: 'chennai', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  { id: 'kolkata', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
  { id: 'hyderabad', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867 },
  { id: 'ahmedabad', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714 },
  { id: 'jaipur', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { id: 'guwahati', city: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam', latitude: 26.1445, longitude: 91.7362 },
  { id: 'bhubaneswar', city: 'Bhubaneswar', district: 'Khordha', state: 'Odisha', latitude: 20.2961, longitude: 85.8245 },
]

export function findWeatherLocation(query) {
  const search = String(query || '').trim().toLocaleLowerCase('en-IN')
  if (!search) return weatherLocations.find((location) => location.isDefault)
  return weatherLocations.find((location) => [location.id, location.city, location.district].some((value) => value.toLocaleLowerCase('en-IN') === search))
}
