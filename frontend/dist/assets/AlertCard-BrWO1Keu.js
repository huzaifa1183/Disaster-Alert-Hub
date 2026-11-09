import{c,j as e,L as t,C as r,p as d,f as n}from"./index-DfaZz---.js";import{M as l}from"./map-pin-BcrOW6jn.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=c("ArrowUpRight",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=c("BadgeCheck",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);function m({severity:s}){return e.jsx("span",{className:`severity-pill severity-${s==null?void 0:s.toLowerCase()}`,children:s})}function j({alert:s,compact:a=!1}){var i;return e.jsxs("article",{className:`alert-card ${a?"alert-card-compact":""}`,children:[e.jsx("div",{className:`alert-edge edge-${(i=s.severity)==null?void 0:i.toLowerCase()}`}),e.jsxs("div",{className:"alert-card-main",children:[e.jsxs("div",{className:"alert-card-top",children:[e.jsx("span",{className:"type-label",children:s.disasterType}),e.jsx(m,{severity:s.severity})]}),e.jsx(t,{className:"alert-title",to:`/alerts/${s.alertId}`,children:s.title}),e.jsxs("div",{className:"alert-location",children:[e.jsx(l,{size:14}),e.jsxs("span",{children:[s.city||s.district,", ",s.state]})]}),!a&&e.jsx("p",{className:"alert-description",children:s.description}),e.jsxs("div",{className:"alert-meta",children:[e.jsxs("span",{title:n(s.timestamp),children:[e.jsx(r,{size:13}),d(s.timestamp)]}),e.jsx("span",{children:s.alertId}),e.jsxs("span",{className:s.verificationStatus==="Verified"?"verified-text":"pending-text",children:[s.verificationStatus==="Verified"?e.jsx(p,{size:13}):e.jsx("span",{className:"tiny-dot"}),s.verificationStatus]}),e.jsx(t,{className:"alert-open",to:`/alerts/${s.alertId}`,"aria-label":`Open ${s.title}`,children:e.jsx(o,{size:17})})]})]})]})}export{j as A,p as B,m as S,o as a};
