const prompts=[
  'Изменение участка целиком удалит малые озёра',
  'Changing the area removes these small lakes',
  'При удалении последнего региона будут также удалены малые озёра',
  'Deleting the last region also removes small lakes',
  'Удалить малые озёра при сбросе карты?',
  'Remove the small lakes when resetting the map?',
];

export function isSmallLakeLossConfirmation(dialog){
  return dialog.type()==='confirm'&&prompts.some(prompt=>dialog.message().includes(prompt));
}
