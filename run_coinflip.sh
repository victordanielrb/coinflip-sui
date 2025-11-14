#!/bin/bash

# Script de exemplo para testar o contrato CoinFlip
# Execute linha por linha e substitua os placeholders pelos IDs reais

echo "=== CoinFlip Contract Interaction Script ==="
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Verificando endereço ativo:${NC}"
sui client active-address

echo ""
echo -e "${BLUE}2. Listando objetos:${NC}"
sui client objects

echo ""
echo -e "${GREEN}3. Publicando o contrato:${NC}"
echo "sui client publish . --gas-budget 10000000"
echo "# Após executar, copie o PACKAGE_ID do resultado"

echo ""
echo -e "${GREEN}4. Criando uma partida (Player 1):${NC}"
echo "# Substitua <PACKAGE_ID> e <COIN_OBJECT_ID>"
echo "sui client call \\"
echo "  --package <PACKAGE_ID> \\"
echo "  --module coinflip \\"
echo "  --function create_match \\"
echo "  --args <COIN_OBJECT_ID> 100 true \\"
echo "  --gas-budget 10000000"

echo ""
echo -e "${GREEN}5. Player 2 entra na partida:${NC}"
echo "# Substitua os IDs e troque para conta do Player 2"
echo "sui client call \\"
echo "  --package <PACKAGE_ID> \\"
echo "  --module coinflip \\"
echo "  --function add_another_player \\"
echo "  --args <COIN_OBJECT_ID_PLAYER2> <MATCH_OBJECT_ID> false \\"
echo "  --gas-budget 10000000 \\"
echo "  --signer <PLAYER2_ADDRESS>"

echo ""
echo -e "${GREEN}6. Definindo o resultado:${NC}"
echo "# true = cara (Player 1 ganha), false = coroa (Player 2 ganha)"
echo "sui client call \\"
echo "  --package <PACKAGE_ID> \\"
echo "  --module coinflip \\"
echo "  --function set_winner \\"
echo "  --args <MATCH_OBJECT_ID> true \\"
echo "  --gas-budget 10000000"

echo ""
echo -e "${GREEN}7. Pagando o vencedor:${NC}"
echo "sui client call \\"
echo "  --package <PACKAGE_ID> \\"
echo "  --module coinflip \\"
echo "  --function pay_winner \\"
echo "  --args <MATCH_OBJECT_ID> \\"
echo "  --gas-budget 10000000"

echo ""
echo -e "${BLUE}Comandos úteis:${NC}"
echo "# Ver objetos de um endereço específico:"
echo "sui client objects --owner <ADDRESS>"
echo ""
echo "# Ver detalhes de um objeto:"
echo "sui client object <OBJECT_ID>"
echo ""
echo "# Trocar de conta ativa:"
echo "sui client switch --address <ADDRESS>"
echo ""
echo "# Listar todas as contas:"
echo "sui client addresses"
echo ""
echo "# Executar testes:"
echo "sui move test"

echo ""
echo -e "${RED}Lembre-se:${NC}"
echo "- Substitua todos os <PLACEHOLDERS> pelos IDs reais"
echo "- O valor da aposta deve ser igual nos dois players"
echo "- Player 2 precisa ser uma conta diferente"
echo "- O resultado da moeda determina quem ganha (true = Player 1, false = Player 2)"