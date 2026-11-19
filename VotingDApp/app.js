
// ==========================================
// 1. CONTRACT CONFIGURATION
// ==========================================

// IMPORTANT: Paste your DEPLOYED VOTING CONTRACT address here.
// Do NOT paste your MetaMask wallet address.
const CONTRACT_ADDRESS = "0xa92a44Dc8F90ab654Caf04257cF497Da523a83E8";

// Sepolia Chain ID
const EXPECTED_CHAIN_ID = 11155111;

// ==========================================
// 2. CONTRACT ABI
// ==========================================

const ABI = [
    "function getCandidates() view returns (tuple(uint256 id, string name, uint256 voteCount)[])",
    "function hasVoted(address) view returns (bool)",
    "function vote(uint256 candidateId)",
    "event VoteCast(address indexed voter, uint256 indexed candidateId)"
];

// ==========================================
// 3. GLOBAL VARIABLES
// ==========================================

let provider;
let signer;
let votingContract;
let currentAccount = null;

// ==========================================
// 4. HTML ELEMENTS
// ==========================================

const connectBtn = document.getElementById("connectBtn");
const accountText = document.getElementById("account");
const networkText = document.getElementById("network");
const statusText = document.getElementById("status");
const candidatesDiv = document.getElementById("candidates");

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================

function setStatus(message) {
    statusText.textContent = message;
}

function shortAddress(address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
}

function validateContractAddress() {
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
        throw new Error(
            "Invalid contract address. Paste your deployed Voting contract address in app.js."
        );
    }
}

// ==========================================
// 6. CHECK NETWORK
// ==========================================

async function checkNetwork() {
    const network = await provider.getNetwork();

    const correctNetwork =
        network.chainId === BigInt(EXPECTED_CHAIN_ID);

    if (correctNetwork) {
        networkText.textContent = "Network: Sepolia ✓";
    } else {
        networkText.textContent =
            "Network: Wrong network. Please select Sepolia.";
    }

    return correctNetwork;
}

// ==========================================
// 7. CONNECT METAMASK
// ==========================================

async function connectWallet() {
    try {
        if (!window.ethereum) {
            setStatus("MetaMask is not installed.");
            return;
        }

        validateContractAddress();

        setStatus("Connecting to MetaMask...");

        provider = new ethers.BrowserProvider(window.ethereum);

        const accounts = await provider.send(
            "eth_requestAccounts",
            []
        );

        if (accounts.length === 0) {
            setStatus("No wallet account found.");
            return;
        }

        currentAccount = ethers.getAddress(accounts[0]);

        signer = await provider.getSigner();

        accountText.textContent =
            "Connected account: " + shortAddress(currentAccount);

        const correctNetwork = await checkNetwork();

        if (!correctNetwork) {
            votingContract = null;
            candidatesDiv.textContent =
                "Please switch MetaMask to Sepolia.";
            setStatus("Wrong network. Select Sepolia in MetaMask.");
            return;
        }

        votingContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            ABI,
            signer
        );

        connectBtn.textContent = "Wallet Connected";

        setStatus("Wallet connected successfully!");

        await loadCandidates();

    } catch (error) {
        console.error("Connection error:", error);

        setStatus(
            "Connection failed: " +
            (error.shortMessage || error.message)
        );
    }
}

// ==========================================
// 8. LOAD CANDIDATES
// ==========================================

async function loadCandidates() {
    try {
        if (!votingContract || !currentAccount) {
            setStatus("Connect your wallet first.");
            return;
        }

        setStatus("Loading candidates...");

        // Get candidates from the smart contract
        const candidates = await votingContract.getCandidates();

        console.log("Candidates:", candidates);

        // Check whether the connected wallet has voted
        const alreadyVoted = await votingContract["hasVoted(address)"](
            currentAccount
        );

        console.log("Already voted:", alreadyVoted);

        candidatesDiv.innerHTML = "";

        if (candidates.length === 0) {
            candidatesDiv.textContent = "No candidates found.";
            return;
        }

        candidates.forEach((candidate) => {
            const id = candidate.id.toString();
            const name = candidate.name;
            const votes = candidate.voteCount.toString();

            // Create candidate card
            const card = document.createElement("div");
            card.className = "candidate-card";

            // Candidate name
            const title = document.createElement("h3");
            title.textContent = name;

            // Vote count
            const voteCount = document.createElement("p");
            voteCount.className = "vote-count";
            voteCount.textContent = "Votes: " + votes;

            // Vote button
            const button = document.createElement("button");

            button.textContent = alreadyVoted
                ? "Already Voted"
                : "Vote for " + name;

            button.disabled = alreadyVoted;

            button.addEventListener("click", () => {
                castVote(id);
            });

            card.appendChild(title);
            card.appendChild(voteCount);
            card.appendChild(button);

            candidatesDiv.appendChild(card);
        });

        if (alreadyVoted) {
            setStatus("You have already voted from this wallet.");
        } else {
            setStatus("Candidates loaded successfully!");
        }

    } catch (error) {
        console.error("Loading candidates error:", error);

        candidatesDiv.textContent =
            "Could not load candidates. Check your contract address and deployment.";

        setStatus(
            "Could not load candidates: " +
            (error.shortMessage || error.message)
        );
    }
}

// ==========================================
// 9. CAST VOTE
// ==========================================

async function castVote(candidateId) {
    try {
        if (!votingContract) {
            setStatus("Connect your wallet first.");
            return;
        }

        const correctNetwork = await checkNetwork();

        if (!correctNetwork) {
            setStatus("Please switch to Sepolia.");
            return;
        }

        // Check duplicate voting
        const alreadyVoted = await votingContract["hasVoted(address)"](
            currentAccount
        );

        if (alreadyVoted) {
            setStatus("You have already voted!");
            await loadCandidates();
            return;
        }

        setStatus("Please confirm the transaction in MetaMask...");

        // Send voting transaction
        const transaction = await votingContract.vote(candidateId);

        setStatus("Transaction submitted. Waiting for confirmation...");

        // Wait for blockchain confirmation
        const receipt = await transaction.wait();

        if (receipt.status !== 1) {
            setStatus("Voting transaction failed.");
            return;
        }

        setStatus(
            "Vote successfully recorded! Transaction: " +
            shortAddress(receipt.hash)
        );

        // Refresh candidate results
        await loadCandidates();

    } catch (error) {
        console.error("Voting error:", error);

        if (error.code === 4001) {
            setStatus("Transaction rejected in MetaMask.");
        } else {
            setStatus(
                "Voting failed: " +
                (error.shortMessage || error.reason || error.message)
            );
        }
    }
}

// ==========================================
// 10. WALLET AND NETWORK CHANGE EVENTS
// ==========================================

if (window.ethereum) {

    window.ethereum.on("accountsChanged", () => {
        window.location.reload();
    });

    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });

}

// ==========================================
// 11. BUTTON EVENT
// ==========================================

connectBtn.addEventListener("click", connectWallet);
