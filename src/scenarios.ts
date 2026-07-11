/**
 * Demo scenarios ported from ontoarc-website /ontoguard-live.
 * Framed as SHACL constraint checks — not solver-confirmed entailments.
 */

export interface DemoScenario {
  id: string;
  title: string;
  plainEnglishSetup: string;
  shapesTurtle: string;
  dataTurtle: string;
}

const conflictingShapes = `@prefix ex: <http://example.org/claims#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

ex:EligibleMustApproveShape a sh:NodeShape ;
  sh:targetClass ex:EligibleClaim ;
  sh:property [
    sh:path ex:decision ;
    sh:hasValue ex:Approved ;
  ] .

ex:FraudHoldNoApproveShape a sh:NodeShape ;
  sh:targetClass ex:FraudHoldClaim ;
  sh:property [
    sh:path ex:decision ;
    sh:hasValue ex:Denied ;
    sh:message "Cannot approve — claimant is under fraud hold, but eligibility rule also requires approval. Conflicting rules detected." ;
  ] .`;

const conflictingBlockingData = `@prefix ex: <http://example.org/claims#> .

ex:claim2291 a ex:Claim, ex:EligibleClaim, ex:FraudHoldClaim ;
  ex:claimId "JD-2291" ;
  ex:decision ex:Approved .`;

const dutyPersistShapes = `@prefix ex: <http://example.org/payments#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:MidPeriodIneligibleClaimant a sh:NodeShape ;
  sh:property [
    sh:path ex:eligibilityEnded ;
    sh:hasValue true ;
  ] ;
  sh:property [
    sh:path ex:periodEnded ;
    sh:hasValue false ;
  ] .

ex:PaymentActionShape a sh:NodeShape ;
  sh:targetClass ex:PaymentAction ;
  sh:property [
    sh:path ex:subjectDuty ;
    sh:minCount 1 ;
    sh:node ex:DutySafeToPay ;
    sh:message "Payment duty still marked active for a period after eligibility ended on day 12. Flagging before payment is sent." ;
  ] .

ex:DutySafeToPay a sh:NodeShape ;
  sh:not [
    sh:and [
      sh:property [
        sh:path ex:dutyStatus ;
        sh:hasValue "active" ;
      ] ;
      sh:property [
        sh:path ex:claimant ;
        sh:minCount 1 ;
        sh:node ex:MidPeriodIneligibleClaimant ;
      ] ;
    ]
  ] ;
  sh:message "Payment duty still marked active for a period after eligibility ended on day 12. Flagging before payment is sent." .`;

const dutyPersistBlockingData = `@prefix ex: <http://example.org/payments#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:pay2291 a ex:PaymentAction ;
  ex:subjectDuty ex:duty2291 .

ex:duty2291 a ex:PaymentDuty ;
  ex:dutyStatus "active" ;
  ex:claimant ex:claimant2291 .

ex:claimant2291 a ex:Claimant ;
  ex:claimId "JD-2291" ;
  ex:eligibilityEndDay 12 ;
  ex:periodLengthDays 30 ;
  ex:eligibilityEnded true ;
  ex:periodEnded false .`;

const refundShapes = `@prefix ex: <http://example.org/refunds#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:RefundUnderLimit a sh:NodeShape ;
  sh:property [
    sh:path ex:amount ;
    sh:datatype xsd:decimal ;
    sh:maxInclusive "50.00"^^xsd:decimal ;
  ] .

ex:RefundHasApproval a sh:NodeShape ;
  sh:property [
    sh:path ex:hasManagerApproval ;
    sh:minCount 1 ;
    sh:class ex:ManagerApproval ;
  ] .

ex:RefundApprovalShape a sh:NodeShape ;
  sh:targetClass ex:Refund ;
  sh:or (
    [ sh:node ex:RefundUnderLimit ]
    [ sh:node ex:RefundHasApproval ]
  ) ;
  sh:message "Refunds over $50 require manager approval — none found for this case." .`;

const refundBlockingData = `@prefix ex: <http://example.org/refunds#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:refund4521 a ex:Refund ;
  ex:amount "80.00"^^xsd:decimal ;
  ex:orderId "4521" .`;

export const demoScenarios: DemoScenario[] = [
  {
    id: "conflicting-rules",
    title: "Conflicting Approval Rules",
    plainEnglishSetup:
      "Two rules apply at once: an eligible claimant must be approved, and a claimant under fraud hold cannot be approved. This case is both.",
    shapesTurtle: conflictingShapes,
    dataTurtle: conflictingBlockingData,
  },
  {
    id: "duty-persists",
    title: "Payment That Won't Stop",
    plainEnglishSetup:
      "A claimant became ineligible mid-period, but the duty-to-pay rule never expires mid-period — so payment keeps going out.",
    shapesTurtle: dutyPersistShapes,
    dataTurtle: dutyPersistBlockingData,
  },
  {
    id: "refund",
    title: "Refund Approval",
    plainEnglishSetup:
      "An agent is about to approve an $80 refund. Policy: refunds over $50 need manager sign-off first.",
    shapesTurtle: refundShapes,
    dataTurtle: refundBlockingData,
  },
];
