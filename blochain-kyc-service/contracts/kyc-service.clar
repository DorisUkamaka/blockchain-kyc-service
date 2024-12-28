;; Define error constants
(define-constant err-unauthorized (err u100))
(define-constant err-already-exists (err u101))
(define-constant err-not-found (err u102))
(define-constant err-already-verified (err u103))
(define-constant err-invalid-kyc-level (err u104))
(define-constant err-document-already-exists (err u105))


;; Define data variables
(define-data-var contract-owner principal tx-sender)
(define-data-var customer-id-nonce uint u0)
(define-data-var business-id-nonce uint u0)

;; Define maps
(define-map customers 
  { customer-id: uint }
  {
    address: principal,
    name: (string-utf8 100),
    date-of-birth: uint,
    residence-country: (string-utf8 50),
    is-verified: bool,
    verification-date: uint,
    kyc-level: uint  ;; New field for KYC level
  }
)
(define-map businesses
  { business-id: uint }
  {
    address: principal,
    name: (string-utf8 100),
    is-approved: bool,
    business-type: (string-utf8 50)  ;; New field for business type
  }
)
(define-map customer-documents
  { customer-id: uint, document-type: (string-utf8 50) }
  {
    document-hash: (buff 32),
    upload-date: uint
  }
)

;; Helper functions
(define-private (is-contract-owner)
  (is-eq tx-sender (var-get contract-owner))
)

(define-private (is-approved-business (business-id uint))
  (match (map-get? businesses { business-id: business-id })
    business (get is-approved business)
    false
  )
)