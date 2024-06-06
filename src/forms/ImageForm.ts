  // // Form 4 descriptionForm -> *imageForm* -> submitForm
  // // FIXME: Skipping for now
  // const imageForm = Devvit.createForm( //TODO: implement when image uploads are launched
  //   (data) => {
  //     return {
  //       fields: [
  //         { name: 'image',
  //         label: 'Select a different image',
  //         type: 'string',
  //         }
  //       ],
  //       title: 'Selecting an Image For Your Post',
  //       acceptLabel: 'Next (post preview)',
  //       cancelLabel: 'Cancel'
  //     }
  //   },
  //   async ({values}, ctx) => {
  //     return ctx.ui.showForm(submitForm, values);
  //   }
  // )