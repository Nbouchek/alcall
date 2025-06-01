#!/bin/bash
set -e

# Create kind cluster
kind create cluster --name unified-chat-dev --wait 5m

# Set kubectl context
kubectl cluster-info --context kind-unified-chat-dev

# Create namespaces
declare -a namespaces=("unified-chat-dev" "monitoring-dev" "logging-dev")
for ns in "${namespaces[@]}"; do
  kubectl create namespace "$ns" || true
done

# Install Istio via Helm
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
helm install istio-base istio/base -n istio-system --create-namespace || true
helm install istiod istio/istiod -n istio-system --wait || true
helm install istio-ingress istio/gateway -n istio-system --wait || true

# Label namespaces for Istio injection
for ns in "${namespaces[@]}"; do
  kubectl label namespace "$ns" istio-injection=enabled --overwrite
done

# Install local-path-provisioner for storage classes
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml

# Set default storage class
yaml_patch='{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
kubectl patch storageclass local-path -p "$yaml_patch"

# Apply basic network policies (allow all within namespace)
for ns in "${namespaces[@]}"; do
  cat <<EOF | kubectl apply -n "$ns" -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-internal
spec:
  podSelector: {}
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
  policyTypes:
    - Ingress
    - Egress
EOF
done

echo "Kind cluster with Istio, namespaces, storage, and network policies is ready."
