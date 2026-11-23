/**
 * tipconfig.js — where the web "Support the developer" link goes.
 *
 * Put the Stripe payment link for Language Dash tips in TIP_URL (an https link, for example
 * https://buy.stripe.com/xxxxxxxx). Until it is set, no tip entry is shown on the website. A build can also override it
 * with the VITE_TIP_URL variable. In the iPhone and Android apps tips are small in-app purchases instead (see tipjar.js),
 * because the stores do not allow an outside payment link inside an app.
 *
 * Language Dash's tips are their own pot, separate from Pro and from every other app. Never point this at another app's tip
 * page: tips.js refuses the Cathology Ko-fi page (ko-fi.com/pathomnemonic), which is reserved for that app.
 */
export var TIP_URL = 'https://buy.stripe.com/4gM28s6s83jj6jp4nC3wQ02';
