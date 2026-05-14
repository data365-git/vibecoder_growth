import { Keyboard } from 'grammy';

export const mainMenu = new Keyboard()
  .text('📋 Daily report').text('☀️ Stand-up').row()
  .text('🎨 Design').text('💼 Business').row()
  .text('📚 Learning').text('🧩 Explain').row()
  .text('📐 Brief').text('📦 Delivery').row()
  .text('📖 Book').text('📊 My score')
  .resized();

export const managerMenu = new Keyboard()
  .text('/today').text('/weekreview').row()
  .text('/offline').text('/online')
  .resized();
