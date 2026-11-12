import{c as a,j as e,L as r,C as c,m as n}from"./index-PM6z7sX9.js";import{M as l}from"./map-pin-BoXiKx9P.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=a("ArrowUpRight",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=a("BadgeCheck",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=a("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);function x({severity:s}){return e.jsx("span",{className:`severity-pill severity-${s==null?void 0:s.toLowerCase()}`,children:s})}function j({alert:s,compact:i=!1}){var t;return e.jsxs("article",{className:`alert-card ${i?"alert-card-compact":""}`,children:[e.jsx("div",{className:`alert-edge edge-${(t=s.severity)==null?void 0:t.toLowerCase()}`}),e.jsxs("div",{className:"alert-card-main",children:[e.jsxs("div",{className:"alert-card-top",children:[e.jsx("span",{className:"type-label",children:s.disasterType}),e.jsx(x,{severity:s.severity})]}),e.jsx(r,{className:"alert-title",to:`/alerts/${s.alertId}`,children:s.title}),e.jsxs("div",{className:"alert-location",children:[e.jsx(l,{size:14}),e.jsxs("span",{children:[s.city||s.district,", ",s.state]})]}),!i&&e.jsx("p",{className:"alert-description",children:s.description}),e.jsxs("div",{className:"alert-meta",children:[e.jsxs("span",{title:n(s.timestamp),children:[e.jsx(c,{size:13}),s.timestamp]}),e.jsx("span",{children:s.alertId}),e.jsxs("span",{className:s.verificationStatus==="Verified"?"verified-text":"pending-text",children:[s.verificationStatus==="Verified"?e.jsx(o,{size:13}):e.jsx("span",{className:"tiny-dot"}),s.verificationStatus]}),s.sourceUrl||s.source_url?e.jsxs("a",{className:"text-link",href:s.sourceUrl||s.source_url,target:"_blank",rel:"noreferrer","aria-label":`Open official source for ${s.title}`,children:[e.jsx(p,{size:14}),s.source]}):e.jsx("span",{children:s.source}),e.jsx(r,{className:"alert-open",to:`/alerts/${s.alertId}`,"aria-label":`Open ${s.title}`,children:e.jsx(d,{size:17})})]})]})]})}export{j as A,o as B,x as S,d as a};
