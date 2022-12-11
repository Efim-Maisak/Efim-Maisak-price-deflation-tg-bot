const { Markup, Scenes } = require('telegraf');
const Big = require('big.js');
let basicYears = require('../bot');
let basicDeflators = require('../bot');


let usedYears = [];
let usedDeflators = [];
let resultFinal = [];


const calcPriceScene = new Scenes.WizardScene('calcPriceWizard', (ctx) => {
    usedYears = [];
    usedDeflators = [];
    resultFinal = [];
    ctx.wizard.state.data = {};
    ctx.wizard.state.data.messageCounter = 0;
    ctx.reply('Введите год начальной цены', Markup.keyboard(['/cancel']).oneTime().resize());
    ctx.wizard.state.data.messageCounter += 1;
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.messageCounter += 1;
    ctx.wizard.state.data.yearAnswer = ctx.message.text;
    if(parseInt(ctx.wizard.state.data.yearAnswer) < parseInt(basicYears.basicYears[0]) || parseInt(ctx.wizard.state.data.yearAnswer) > parseInt(basicYears.basicYears[basicYears.basicYears.length - 2]) || isNaN(ctx.wizard.state.data.yearAnswer)) {
      deleteMessages(ctx.wizard.state.data.messageCounter - 1, ctx);
      ctx.reply('Вы ввели неправильный год начальной цены.');
      return ctx.scene.leave();
    } else {
      ctx.reply('Введите начальную цену', Markup.keyboard(['/cancel']).oneTime().resize());
      ctx.wizard.state.data.messageCounter += 1;
      return ctx.wizard.next();
    }
  },
  (ctx) => {
    ctx.wizard.state.data.messageCounter += 1;
    ctx.wizard.state.data.priceAnswer = ctx.message.text;
    if(Number(ctx.wizard.state.data.priceAnswer.replace(",", ".")) <= 0 || isNaN(ctx.wizard.state.data.priceAnswer.replace(",", "."))) {
      deleteMessages(ctx.wizard.state.data.messageCounter  - 1, ctx);
      ctx.reply('Вы ввели некорректное число.');
      return ctx.scene.leave();
    } else {
      ctx.wizard.state.data.calcPrice = calcPrice(ctx.wizard.state.data.yearAnswer, ctx.wizard.state.data.priceAnswer, basicYears.basicYears, basicDeflators.basicDeflators);
      deleteMessages(ctx.wizard.state.data.messageCounter - 1, ctx);
      ctx.reply(`
      Вы ввели год: ${ctx.wizard.state.data.yearAnswer} и цену: ${ctx.wizard.state.data.priceAnswer.replace(".", ",")}\nРезультат:\n${createCalcResponse(resultFinal, usedYears, usedDeflators)}
      `, Markup.keyboard(['/calc']).resize());
    }
    return ctx.scene.leave();
  }
);


calcPriceScene.hears('/cancel', async (ctx) => {
  deleteMessages(ctx.wizard.state.data.messageCounter - 1, ctx);
  await ctx.scene.leave();
  ctx.reply('Расчет отменен.');
});


function calcPrice(originalYear, originalPrice, years, deflators) {
  let yearIndex = years.indexOf(originalYear); // получаем индекс элемента исходного года (priceYear)
  let result = [];
  const priceBig = new Big(parseFloat(originalPrice.replace(",", ".")));

  if (yearIndex !== -1) {
    let semiResult = priceBig;
      for (let i = yearIndex + 1; i < years.length; i++) {
        if (priceBig !== semiResult) {
          try {
            // расчет дефлятора, если цена не равна промежуточному(или начальному) значению
            let semiResultIternal = new Big(semiResult);
            let divByHundred = semiResultIternal.div(100);
            let times = divByHundred.times(deflators[i]);
            let plused = semiResultIternal.plus(times);
            plused = Math.floor(plused * 100) / 100; // обрезать до двух знаков после запятой
            semiResult = plused;
            usedYears.push(years[i]);
            usedDeflators.push(String(deflators[i]).replace(".", ",").concat("%"));
            result.push(plused);
          } catch(e) {
            new Error('Ошибка вычислений');
          }

        } else {
          try {
            // расчет первого дефлятора
            let divByHundred = new Big(priceBig.div(100));
            let times = new Big(divByHundred.times(deflators[i]));
            let plused = new Big(priceBig.plus(times));
            semiResult = Math.floor(plused * 100) / 100; // обрезать до двух знаков после запятой
            usedYears.push(years[i]);
            usedDeflators.push(String(deflators[i]).replace(".", ",").concat("%"));
            result.push(semiResult);
          } catch(e) {
            new Error('Ошибка вычислений');
          }

        }
      }

      resultFinal = result.map( price => {
          return price.toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
      });

  }
}


function createCalcResponse(result, usedYearsArr, usedDeflatorsArr) {

  let resultArr = [];

  for(let i = 0; i < result.length; i++) {
    let lineArr = [];
    lineArr.push(usedYearsArr[i], usedDeflatorsArr[i], result[i]);
    const lineString = lineArr.join(' | ');
    resultArr.push(lineString);
  }


  return resultArr.join('\n');
}


async function deleteMessages(count, ctx) {
  let messageId = 0;
  for(let i = ctx.message.message_id; i >= ctx.message.message_id - count; i--){
    messageId = i;
    try {
      await ctx.deleteMessage(messageId);
    } catch(e) {
      new Error('Ошибка удаления сообщения');
    }

  }
}



module.exports = calcPriceScene;
//module.exports = {deleteMessages};
