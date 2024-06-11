import { FundraiserCreationResponse, SerializedFundraiserCreationResponse, EveryExistingFundraiserInfo, SerializedEveryExistingFundraiserInfo } from "../types/index.js";

export function convertToDate(dateString: string | undefined): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { //FIXME: We may want to throw an exception here
        console.error(`Invalid date string: ${dateString}`);
        return null;
    }
    return date;
}

export function generateDateOptions() {
    const options = [];
    const today = new Date();
    today.setDate(today.getDate() + 1); // Start from tomorrow
  
    for (let i = 0; i < 180; i++) { // Generate dates for the next 6 months. We could parameterize this
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0]; // Format as "YYYY-MM-DD"
      options.push({ label: dateString, value: dateString });
    }
  
    return options;
  }

export function serializeFundraiserCreationResponse(data: FundraiserCreationResponse): SerializedFundraiserCreationResponse {
  console.log(data.startDate)  
  return {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: new Date(data.endDate).toISOString(),
        createdAt: new Date(data.createdAt).toISOString(),
        updatedAt: new Date(data.updatedAt).toISOString()
    };
}

export function serializeExistingFundraiserResponse(data: EveryExistingFundraiserInfo): SerializedEveryExistingFundraiserInfo {
  console.log(data.startDate)
  return {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        pinnedAt: data.pinnedAt ? new Date(data.pinnedAt).toISOString() : null,
        description: data.description ?? ""
    };
}

export const getTomorrowDate = (): Date => {
    const today = new Date();
    return new Date(today.setDate(today.getDate() + 1));
};
