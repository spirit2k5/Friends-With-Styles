'use strict';

const PRODUCTS = Array.isArray(window.FWS_PRODUCTS) ? window.FWS_PRODUCTS : [];
const CART_KEY = 'fws_cart_final_v2_test_number';
const WHATSAPP = '27760584332';
const COLLECTION_ADDRESS = '1575A Forbes Road, Meadowlands Zone 9, Soweto, Gauteng';
const COLLECTION_MAP_URL = 'https://maps.app.goo.gl/KFNFxUCZRoGGXu5n8';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => `R ${Number(value || 0).toLocaleString('en-ZA')}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
}[character]));
const unique = values => [...new Set(values.filter(Boolean))];
const variantNames = product => Object.keys(product.variants || {});
const productImages = product => unique(Object.values(product.variants || {}).flat());
const defaultImage = product => product.cardImage || productImages(product)[0] || 'assets/images/logo.png';


const colourEmoji = colour => {
  const value = String(colour || '').toLowerCase();
  if (value.includes('black & white')) return '\u26AB\u26AA';
  if (value.includes('sky blue') || value.includes('bright blue') || value.includes('light blue')) return '\uD83D\uDD39';
  if (value.includes('blue')) return '\uD83D\uDD35';
  if (value.includes('pink')) return '\uD83C\uDF38';
  if (value.includes('grey') || value.includes('gray')) return '\u25FB\uFE0F';
  if (value.includes('white')) return '\u26AA';
  if (value.includes('black')) return '\u26AB';
  if (value.includes('red')) return '\uD83D\uDD34';
  if (value.includes('orange')) return '\uD83D\uDFE0';
  if (value.includes('yellow')) return '\uD83D\uDFE1';
  if (value.includes('green') || value.includes('sage')) return '\uD83D\uDFE2';
  if (value.includes('brown') || value.includes('beige') || value.includes('tan')) return '\uD83D\uDFE4';
  return '\uD83C\uDFA8';
};

const colourSwatch = colour => {
  const value = String(colour || '').toLowerCase();
  if (value.includes('other colour')) return 'conic-gradient(#e53935,#fb8c00,#fdd835,#43a047,#1e88e5,#8e24aa,#e53935)';
  if (value.includes('black & white')) return 'conic-gradient(#111 0 25%,#fff 0 50%,#111 0 75%,#fff 0)';
  if (value.includes('brown check')) return 'conic-gradient(#6d452d 0 25%,#e7d5bd 0 50%,#6d452d 0 75%,#e7d5bd 0)';
  if (value.includes('sage') || value.includes('light green check')) return 'conic-gradient(#9dad90 0 25%,#f1eadf 0 50%,#9dad90 0 75%,#f1eadf 0)';
  if (value.includes('brown pinstripe')) return 'repeating-linear-gradient(135deg,#70472f 0 6px,#f1dfca 6px 7px)';
  if (value.includes('green pinstripe')) return 'repeating-linear-gradient(135deg,#355f45 0 6px,#dce9dc 6px 7px)';
  if (value.includes('red pinstripe')) return 'repeating-linear-gradient(135deg,#a92f37 0 6px,#f4d7d8 6px 7px)';
  if (value.includes('chocolate')) return '#5b3425';
  if (value.includes('light brown')) return '#b78662';
  if (value.includes('brown')) return '#765039';
  if (value.includes('beige') || value.includes('tan')) return '#d5bea0';
  if (value.includes('dark blue')) return '#18385d';
  if (value.includes('bright blue')) return '#2389da';
  if (value.includes('sky blue')) return '#78c8ee';
  if (value.includes('blue')) return '#2459a8';
  if (value.includes('sage') || value.includes('green')) return '#7f9878';
  if (value.includes('grey') || value.includes('gray')) return '#989898';
  if (value.includes('black')) return '#111111';
  if (value.includes('white')) return '#ffffff';
  if (value.includes('red')) return '#c8323b';
  if (value.includes('pink')) return '#e89ab3';
  if (value.includes('orange')) return '#ea7a25';
  if (value.includes('yellow')) return '#e0ba2b';
  return '#777777';
};

const orderMethodEmoji = method => ({ Delivery: '\uD83D\uDE9A', Collection: '\uD83C\uDFEC', PAXI: '\uD83D\uDCE6' }[method] || '\uD83D\uDCCB');

let filter = 'All';
let query = '';
let cart = [];
try {
  const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  cart = Array.isArray(stored) ? stored.filter(item => PRODUCTS.some(product => product.id === item.productId)) : [];
} catch {
  cart = [];
}

let activeProduct = null;
let activeImages = [];
let activeImageIndex = 0;
let selectedColour = '';
let selectedSize = '';
let modalQuantity = 1;
let gpsLink = '';

const grid = $('#productGrid');
const filters = $('#filters');
const emptyState = $('#emptyState');
const toastElement = $('#toast');

function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.remove('hidden');
  clearTimeout(window.fwsToastTimer);
  window.fwsToastTimer = setTimeout(() => toastElement.classList.add('hidden'), 2400);
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* Shopping still works without storage. */ }
  renderCart();
  updateCheckoutSummary();
}

function itemCount() { return cart.reduce((total, item) => total + item.quantity, 0); }
function productsTotal() { return cart.reduce((total, item) => total + item.price * item.quantity, 0); }
function upfrontPayment() { return Math.ceil(productsTotal() * 0.5); }
function productBalance() { return Math.max(0, productsTotal() - upfrontPayment()); }
function selectedMethod() { return document.querySelector('input[name="orderMethod"]:checked')?.value || 'Delivery'; }
function paxiFee() { return selectedMethod() === 'PAXI' ? Number($('#paxiSpeed').value || 0) : 0; }

function renderFilters() {
  const categories = ['All', ...unique(PRODUCTS.map(product => product.category))];
  filters.innerHTML = categories.map(category => `<button class="filter-button ${filter === category ? 'active' : ''}" type="button" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
}

function renderProducts() {
  const normalizedQuery = query.trim().toLowerCase();
  const list = PRODUCTS.filter(product => {
    const matchesCategory = filter === 'All' || product.category === filter;
    const searchable = `${product.name} ${product.category} ${product.description} ${variantNames(product).join(' ')}`.toLowerCase();
    return matchesCategory && searchable.includes(normalizedQuery);
  });

  grid.innerHTML = list.map(product => `
    <article class="product-card" data-product="${escapeHtml(product.id)}" tabindex="0" aria-label="Open ${escapeHtml(product.name)}">
      <div class="product-image-wrap">
        <img loading="lazy" src="${escapeHtml(defaultImage(product))}" alt="${escapeHtml(product.name)}">
        <div class="card-badges">${(product.badges || []).map(badge => `<span class="badge">${escapeHtml(badge)}</span>`).join('')}</div>
      </div>
      <div class="product-card-info">
        <h3>${escapeHtml(product.name)}</h3>
        <div class="product-card-row"><strong>${money(product.price)}</strong><span>${escapeHtml(product.category)}</span></div>
        <div class="product-colour-count">${variantNames(product).length} colour${variantNames(product).length === 1 ? '' : 's'} available</div>
        <div class="product-swatches" aria-label="Available colours">${variantNames(product).slice(0, 7).map(colour => `<span class="mini-swatch" style="--swatch:${escapeHtml(colourSwatch(colour))}" title="${escapeHtml(colour)}" aria-label="${escapeHtml(colour)}"></span>`).join('')}${variantNames(product).length > 7 ? `<span class="swatch-more">+${variantNames(product).length - 7}</span>` : ''}</div>
      </div>
    </article>
  `).join('');

  emptyState.classList.toggle('hidden', list.length > 0);
}

function setGallery(images, showPhotoNote = false) {
  activeImages = images.length ? images : (showPhotoNote ? ['assets/images/logo.png'] : productImages(activeProduct));
  if (!activeImages.length) activeImages = ['assets/images/logo.png'];
  activeImageIndex = 0;
  $('#photoNote').classList.toggle('hidden', !showPhotoNote);
  renderGallery();
}

function renderGallery() {
  const image = activeImages[activeImageIndex] || activeImages[0];
  $('#modalImage').src = image;
  $('#modalImage').alt = `${activeProduct?.name || 'Product'} image ${activeImageIndex + 1}`;
  $('#galleryCount').textContent = `${activeImageIndex + 1} / ${activeImages.length}`;
  $('#galleryPrev').classList.toggle('hidden', activeImages.length <= 1);
  $('#galleryNext').classList.toggle('hidden', activeImages.length <= 1);
  $('#galleryThumbs').innerHTML = activeImages.map((source, index) => `
    <button type="button" class="gallery-thumb ${index === activeImageIndex ? 'active' : ''}" data-image-index="${index}" aria-label="View image ${index + 1}"><img src="${escapeHtml(source)}" alt=""></button>
  `).join('');
}

function renderProductOptions() {
  const colours = variantNames(activeProduct);
  $('#colourChoices').innerHTML = colours.map(colour => `<button type="button" class="choice-button colour-choice" data-colour="${escapeHtml(colour)}" style="--swatch:${escapeHtml(colourSwatch(colour))}"><span class="colour-dot" aria-hidden="true"></span><span>${colourEmoji(colour)} ${escapeHtml(colour)}</span></button>`).join('');
  $('#sizeChoices').innerHTML = (activeProduct.sizes || []).map(size => `<button type="button" class="choice-button" data-size="${escapeHtml(size)}">${escapeHtml(size)}</button>`).join('');

  if (colours.length === 1) {
    selectedColour = colours[0];
    $('#selectedColourLabel').textContent = `\u2014 ${colourEmoji(selectedColour)} ${selectedColour}`;
    $('#colourChoices .choice-button')?.classList.add('selected');
    const images = activeProduct.variants[selectedColour] || [];
    setGallery(images, images.length === 0);
  }
  if ((activeProduct.sizes || []).length === 1) {
    selectedSize = activeProduct.sizes[0];
    $('#selectedSizeLabel').textContent = `\u2014 ${selectedSize}`;
    $('#sizeChoices .choice-button')?.classList.add('selected');
  }
}

function openProduct(id) {
  activeProduct = PRODUCTS.find(product => product.id === id);
  if (!activeProduct) return;
  selectedColour = '';
  selectedSize = '';
  modalQuantity = 1;
  $('#modalTitle').textContent = activeProduct.name;
  $('#modalPrice').textContent = money(activeProduct.price);
  $('#modalDescription').textContent = activeProduct.description;
  $('#modalBadges').innerHTML = (activeProduct.badges || []).map(badge => `<span class="badge">${escapeHtml(badge)}</span>`).join('');
  $('#selectedColourLabel').textContent = '\u2014 choose one';
  $('#selectedSizeLabel').textContent = '\u2014 choose one';
  $('#modalQuantity').textContent = modalQuantity;
  setGallery(productImages(activeProduct), false);
  renderProductOptions();
  $('#productModal').classList.remove('hidden');
  $('#productModal').setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
}

function closeProduct() {
  $('#productModal').classList.add('hidden');
  $('#productModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('locked');
}

function selectColour(colour, button) {
  selectedColour = colour;
  $('#selectedColourLabel').textContent = `\u2014 ${colourEmoji(colour)} ${colour}`;
  $$('#colourChoices .choice-button').forEach(choice => choice.classList.toggle('selected', choice === button));
  const colourImages = activeProduct.variants?.[colour] || [];
  setGallery(colourImages, colourImages.length === 0);
}

function selectSize(size, button) {
  selectedSize = size;
  $('#selectedSizeLabel').textContent = `\u2014 ${size}`;
  $$('#sizeChoices .choice-button').forEach(choice => choice.classList.toggle('selected', choice === button));
}

function addSelectedToCart() {
  if (!activeProduct) return;
  if (!selectedColour) return toast('Choose a colour first');
  if (!selectedSize) return toast('Choose a size first');
  const key = `${activeProduct.id}|${selectedColour}|${selectedSize}`;
  const existing = cart.find(item => item.key === key);
  if (existing) existing.quantity += modalQuantity;
  else {
    const variantImage = activeProduct.variants?.[selectedColour]?.[0] || defaultImage(activeProduct);
    cart.push({key,productId:activeProduct.id,name:activeProduct.name,price:activeProduct.price,image:variantImage,colour:selectedColour,size:selectedSize,quantity:modalQuantity});
  }
  saveCart();
  const name = activeProduct.name;
  closeProduct();
  toast(`${name} added to bag`);
}

function renderCart() {
  $('#cartCount').textContent = itemCount();
  $('#cartTotal').textContent = money(productsTotal());
  $('#cartDeposit').textContent = money(upfrontPayment());
  $('#cartBalance').textContent = money(productBalance());
  if (!cart.length) {
    $('#cartItems').innerHTML = '<div class="cart-empty">Your bag is empty. Open a product and choose its colour and size.</div>';
    return;
  }
  $('#cartItems').innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
      <div><h3>${escapeHtml(item.name)}</h3><div class="cart-meta">${colourEmoji(item.colour)} ${escapeHtml(item.colour)} \u00B7 \uD83D\uDCCF ${escapeHtml(item.size)}</div><div class="cart-price">${money(item.price * item.quantity)}</div></div>
      <strong>${item.quantity}\u00D7</strong>
      <div class="cart-qty"><button type="button" data-minus="${escapeHtml(item.key)}" aria-label="Reduce quantity">\u2212</button><b>${item.quantity}</b><button type="button" data-plus="${escapeHtml(item.key)}" aria-label="Increase quantity">+</button><button class="remove-link" type="button" data-remove="${escapeHtml(item.key)}">Remove</button></div>
    </div>
  `).join('');
}

function openCart(){ $('#cartOverlay').classList.remove('hidden'); $('#cartOverlay').setAttribute('aria-hidden','false'); document.body.classList.add('locked'); }
function closeCart(){ $('#cartOverlay').classList.add('hidden'); $('#cartOverlay').setAttribute('aria-hidden','true'); document.body.classList.remove('locked'); }
function openCheckout(){ if(!cart.length)return toast('Your bag is empty'); closeCart(); $('#checkoutModal').classList.remove('hidden'); $('#checkoutModal').setAttribute('aria-hidden','false'); document.body.classList.add('locked'); syncMethodFields(); }
function closeCheckout(){ $('#checkoutModal').classList.add('hidden'); $('#checkoutModal').setAttribute('aria-hidden','true'); document.body.classList.remove('locked'); }

function syncMethodFields() {
  const method = selectedMethod();
  $('#deliveryFields').classList.toggle('hidden', method !== 'Delivery');
  $('#collectionFields').classList.toggle('hidden', method !== 'Collection');
  $('#paxiFields').classList.toggle('hidden', method !== 'PAXI');
  updateCheckoutSummary();
}

function updateCheckoutSummary() {
  const method = selectedMethod();
  const products = productsTotal();
  const shipping = paxiFee();
  $('#checkoutProducts').textContent = money(products);
  $('#checkoutDeposit').textContent = money(upfrontPayment());
  $('#checkoutBalance').textContent = money(productBalance());
  if (method === 'PAXI') {
    $('#checkoutDelivery').textContent = money(shipping);
    $('#checkoutTotal').textContent = money(products + shipping);
  } else if (method === 'Collection') {
    $('#checkoutDelivery').textContent = money(0);
    $('#checkoutTotal').textContent = money(products);
  } else {
    $('#checkoutDelivery').textContent = 'To confirm by distance';
    $('#checkoutTotal').textContent = `${money(products)} + delivery`;
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) return toast('Location is not supported on this device');
  $('#locationStatus').textContent = 'Getting location\u2026';
  navigator.geolocation.getCurrentPosition(position => {
    gpsLink = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
    $('#locationStatus').textContent = 'Current location added \u2713';
    toast('Current location added');
  }, () => {
    $('#locationStatus').textContent = 'Location permission was not granted';
    toast('Could not access location');
  }, {enableHighAccuracy:true,timeout:12000});
}

function orderMessage() {
  const method = selectedMethod();
  const products = productsTotal();
  const fee = paxiFee();
  const lines = [
    '*NEW FRIENDS WITH STYLE ORDER*',
    '',
    '*CUSTOMER DETAILS*',
    `- Name: ${$('#customerName').value.trim()}`,
    `- Phone: ${$('#customerPhone').value.trim()}`,
    `- Email: ${$('#customerEmail').value.trim() || 'Not provided'}`,
    `- Order method: ${method}`
  ];

  if (method === 'Delivery') {
    lines.push(
      '',
      '*DELIVERY DETAILS*',
      `- Address: ${$('#deliveryAddress').value.trim() || 'Not entered'}`
    );
    if (gpsLink) lines.push(`- Current location: ${gpsLink}`);
    lines.push(
      '- Delivery schedule: Wednesdays and Saturdays',
      '- Delivery fee: Please confirm according to distance'
    );
  } else if (method === 'Collection') {
    lines.push(
      '',
      '*COLLECTION DETAILS*',
      `- Collection point: Friends With Style Designs - ${COLLECTION_ADDRESS}`,
      `- Directions: ${COLLECTION_MAP_URL}`,
      `- Preferred collection time: ${$('#collectionNote').value.trim() || 'No preferred time entered'}`,
      '- Collection note: Please confirm when the order is ready before I travel.'
    );
  } else {
    const paxiText = $('#paxiSpeed').options[$('#paxiSpeed').selectedIndex]?.text || '';
    lines.push(
      '',
      '*PAXI DETAILS*',
      `- Town / City: ${$('#paxiTown').value.trim()}`,
      `- Province: ${$('#paxiProvince').value}`,
      `- PEP / PAXI pickup point: ${$('#paxiPoint').value.trim()}`,
      `- PAXI option: ${paxiText}`
    );
  }

  lines.push('', '*ITEMS*');
  cart.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name}`,
      `   - Quantity: ${item.quantity}`,
      `   - Colour: ${item.colour}`,
      `   - Size: ${item.size}`,
      `   - Unit price: ${money(item.price)}`,
      `   - Subtotal: ${money(item.price * item.quantity)}`
    );
  });

  lines.push(
    '',
    '*PAYMENT SUMMARY*',
    `- Products total: ${money(products)}`,
    `- 50% upfront payment: ${money(upfrontPayment())}`,
    `- Remaining product balance: ${money(productBalance())}`
  );

  if (method === 'PAXI') {
    lines.push(
      `- PAXI fee: ${money(fee)}`,
      `- Estimated order total: ${money(products + fee)}`
    );
  } else if (method === 'Collection') {
    lines.push(`- Estimated order total: ${money(products)}`);
  } else {
    lines.push('- Estimated order total: Products total plus delivery fee');
  }

  lines.push(
    `- Notes: ${$('#orderNotes').value.trim() || 'None'}`,
    '',
    '*ORDER POLICY*',
    '- Accepted: Yes',
    '- Please confirm stock, production time, final total and payment details.'
  );

  return lines.join('\n');
}

$('#mobileMenu').addEventListener('click',()=>{const opened=$('#navLinks').classList.toggle('open');$('#mobileMenu').setAttribute('aria-expanded',String(opened));});
$$('#navLinks a').forEach(link=>link.addEventListener('click',()=>{$('#navLinks').classList.remove('open');$('#mobileMenu').setAttribute('aria-expanded','false');}));
$('#searchInput').addEventListener('input',event=>{query=event.target.value;renderProducts();});
filters.addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;filter=button.dataset.filter;renderFilters();renderProducts();});
grid.addEventListener('click',event=>{const card=event.target.closest('[data-product]');if(card)openProduct(card.dataset.product);});
grid.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;event.preventDefault();const card=event.target.closest('[data-product]');if(card)openProduct(card.dataset.product);});
$$('[data-close-product]').forEach(element=>element.addEventListener('click',closeProduct));
$('#galleryPrev').addEventListener('click',()=>{activeImageIndex=(activeImageIndex-1+activeImages.length)%activeImages.length;renderGallery();});
$('#galleryNext').addEventListener('click',()=>{activeImageIndex=(activeImageIndex+1)%activeImages.length;renderGallery();});
$('#galleryThumbs').addEventListener('click',event=>{const button=event.target.closest('[data-image-index]');if(!button)return;activeImageIndex=Number(button.dataset.imageIndex)||0;renderGallery();});
$('#colourChoices').addEventListener('click',event=>{const button=event.target.closest('[data-colour]');if(button)selectColour(button.dataset.colour,button);});
$('#sizeChoices').addEventListener('click',event=>{const button=event.target.closest('[data-size]');if(button)selectSize(button.dataset.size,button);});
$('#modalMinus').addEventListener('click',()=>{modalQuantity=Math.max(1,modalQuantity-1);$('#modalQuantity').textContent=modalQuantity;});
$('#modalPlus').addEventListener('click',()=>{modalQuantity+=1;$('#modalQuantity').textContent=modalQuantity;});
$('#addSelectedToCart').addEventListener('click',addSelectedToCart);
$('#cartButton').addEventListener('click',openCart);
$$('[data-close-cart]').forEach(element=>element.addEventListener('click',closeCart));
$('#continueShopping').addEventListener('click',closeCart);
$('#cartItems').addEventListener('click',event=>{const plus=event.target.closest('[data-plus]');const minus=event.target.closest('[data-minus]');const remove=event.target.closest('[data-remove]');const key=plus?.dataset.plus||minus?.dataset.minus||remove?.dataset.remove;if(!key)return;const item=cart.find(entry=>entry.key===key);if(!item)return;if(remove)cart=cart.filter(entry=>entry.key!==key);else if(plus)item.quantity+=1;else{item.quantity-=1;if(item.quantity<=0)cart=cart.filter(entry=>entry.key!==key);}saveCart();});
$('#startCheckout').addEventListener('click',openCheckout);
$$('[data-close-checkout]').forEach(element=>element.addEventListener('click',closeCheckout));
$$('input[name="orderMethod"]').forEach(input=>input.addEventListener('change',syncMethodFields));
$('#paxiSpeed').addEventListener('change',updateCheckoutSummary);
$('#useLocation').addEventListener('click',useCurrentLocation);
$('#checkoutForm').addEventListener('submit',event=>{
  event.preventDefault();
  const method=selectedMethod();
  if(!$('#customerName').value.trim()||!$('#customerPhone').value.trim())return toast('Enter your name and phone number');
  if(method==='Delivery'&&!$('#deliveryAddress').value.trim()&&!gpsLink)return toast('Enter an address or use current location');
  if(method==='PAXI'&&(!$('#paxiTown').value.trim()||!$('#paxiProvince').value||!$('#paxiPoint').value.trim()))return toast('Complete the PAXI town, province and pickup point');
  if(!$('#acceptPolicy').checked)return toast('Accept the order policy first');
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(orderMessage())}`,'_blank','noopener');
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!$('#productModal').classList.contains('hidden'))closeProduct();if(!$('#cartOverlay').classList.contains('hidden'))closeCart();if(!$('#checkoutModal').classList.contains('hidden'))closeCheckout();}});
$('#year').textContent=new Date().getFullYear();
renderFilters();renderProducts();renderCart();updateCheckoutSummary();
