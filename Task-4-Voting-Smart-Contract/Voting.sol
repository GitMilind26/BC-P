
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {

    // Structure to store candidate details
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    // Array to store all candidates
    Candidate[] private candidates;

    // Mapping to check whether an address has voted
    mapping(address => bool) public hasVoted;

    // Event emitted after a successful vote
    event VoteCast(address indexed voter, uint indexed candidateId);

    // Constructor initializes three candidates
    constructor() {
        candidates.push(Candidate(1, "Alice", 0));
        candidates.push(Candidate(2, "Bob", 0));
        candidates.push(Candidate(3, "Charlie", 0));
    }

    // Function to retrieve all candidates
    function getCandidates()
        public
        view
        returns (Candidate[] memory)
    {
        return candidates;
    }

    // Function to cast a vote
    function vote(uint candidateId) public {

        // Check whether the user has already voted
        require(!hasVoted[msg.sender], "You have already voted");

        // Check whether candidate ID is valid
        require(
            candidateId > 0 && candidateId <= candidates.length,
            "Invalid candidate ID"
        );

        // Mark the sender as having voted
        hasVoted[msg.sender] = true;

        // Increase the selected candidate's vote count
        candidates[candidateId - 1].voteCount++;

        // Emit event after successful voting
        emit VoteCast(msg.sender, candidateId);
    }
}
