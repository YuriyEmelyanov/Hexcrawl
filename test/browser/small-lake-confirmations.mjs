const prompts=[
  'Удалить малые озёра при сбросе карты?',
  'Remove the small lakes when resetting the map?',
];

export function isSmallLakeLossConfirmation(dialog){
  return dialog.type()==='confirm'&&prompts.some(prompt=>dialog.message().includes(prompt));
}
