// // Form 3 searchSelectForm -> *descriptionForm* -> imageForm
// //FIXME: Skipping for now. I need this is buggy, too.

// const descriptionForm = Devvit.createForm( //TODO: unfinished
//   () => {
//     return {
//       fields: [
//         { label: `Fill in the text of your post here`,
//         type: 'paragraph',
//         name: 'description'}
//       ],
//       title: 'Describing Your Fundraiser',
//       acceptLabel: 'Next (post preview)',//'Next (image upload)',
//       cancelLabel: 'Cancel'
//     }
//   },
//   async ({values}, ctx) => {
//     if (values.description != null) {
//       let cachedDescriptionForm; // Declare outside the try block
//       try {
//         const key = await createUserSubredditHashKey(ctx);
//         cachedDescriptionForm = await returnCachedFormAsJSON<EveryNonprofitInfo, FundraiserFormFields>(ctx, key);
//         if (cachedDescriptionForm != null) {
//           cachedDescriptionForm.setFormField('formDescription', values.description);
//           console.log("cachedDescriptionForm: ", cachedDescriptionForm);
//         } else {
//           throw new Error("Cached form is null");
//         }
//       } catch (error) {
//         console.error('Failed to get userSubreddit Key or set form in redis:', error);
//         ctx.ui.showToast("There was an error, please try again later!");
//       }
//       if (cachedDescriptionForm) {
//         const nonprofitInfoArray = [cachedDescriptionForm.getAllNonprofitProps()]; 
//         return ctx.ui.showForm(submitForm, convertToFormData(nonprofitInfoArray));
//       }
//     }
//   }
// );
//   async ({ values }, ctx) => {
//     const {reddit} = ctx;
//     const currentSubreddit = await reddit.getCurrentSubreddit();
//     const postTitle = values.postTitle;
//     const nonprofitInfo: EveryNonprofitInfo = JSON.parse(values.nonprofit) as EveryNonprofitInfo;
//     console.log(postTitle + " ::::LOGO::: " + JSON.stringify(nonprofitInfo.logoUrl));

//     const imageUrl: string | null = nonprofitInfo.logoUrl;
//     let response: MediaAsset;

//     try {
//       response = await ctx.media.upload({
//         url: imageUrl,
//         type: 'image',
//       });
//     } catch (e) {
//       console.log(StringUtil.caughtToString(e));
//       console.log('Image upload failed.');
//       console.log(`Please use images from ${ApprovedDomainsFormatted}.`);
//       return;
//     }

//     const myrichtext = new RichTextBuilder()
//       .paragraph((p) => {
//         p.text({
//           text: nonprofitInfo.description
//         }).text({
//           text: "secondChild"
//         });
//       }).image({
//         mediaId: response.mediaId
//       })
//       .build();
//     // console.log(myrichtext)

//     const post: Post = await reddit.submitPost({
//       //preview: LoadingState(),
//       title: postTitle && postTitle.length > 0 ? postTitle : `Nonprofit Fundraiser`,
//       subredditName: currentSubreddit.name,
//       richtext: myrichtext,
//     });
//  }
// );