import type { Context, JSONObject, Post } from '@devvit/public-api';
import { GeneralNonprofitInfo } from '../types/index.js';


function convertEveryNonprofitToFormData(
    nonprofits: GeneralNonprofitInfo[] | null
  ): { nonprofits: GeneralNonprofitInfo[] } {
    return {
      nonprofits: nonprofits ?? [],
    };
  }

export function cacheNonProfitSearchResults<T extends GeneralNonprofitInfo>(context: Context, searchResults: T[] | null){
    context.cache(
        //FIXME: Refactor to simplify?
        async () => {
            if (typeof searchResults != null){
              let searchDataObject: JSONObject = convertEveryNonprofitToFormData(searchResults) as JSONObject;
              return searchDataObject;
            }
            else {
              let emptySearchResult:JSONObject = {};
              return emptySearchResult;
            }
        },{
            key: 'some-fetch', //FIXME: these keys may need to be unique as redis is shared to a subreddit
            ttl: 100_000, // millis
        }
    );
}
