import random
import json
import sys

# List of people
people = [
    {"name": "Martin", "image": "martin.png", "nbr": 4, "mail": "martin.moureau@epfl.ch"},
    {"name": "Rodrigue", "image": "rodrigue.png", "nbr": 2, "mail": "rodrigue.deguerre@epfl.ch"},
    {"name": "Martin", "image": "martin.png", "nbr": 4, "mail": "martin.moureau@epfl.ch"},
    {"name": "Rodrigue", "image": "rodrigue.png", "nbr": 2, "mail": "rodrigue.deguerre@epfl.ch"},
    {"name": "César", "image": "cesar.png", "nbr": 3, "mail": "cesar.camus-emschwiller@epfl.ch"},
    {"name": "Rémi", "image": "remi.png", "nbr": 4, "mail": "remi.desire@epfl.ch"},
    {"name": "Spout", "image": "spout.png", "nbr": 3, "mail": "guillaume.hugot@epfl.ch"},
    {"name": "Alexis", "image": "alexis.png", "nbr": 2, "mail": "alexis.firome@epfl.ch"},
    {"name": "Emma", "image": "emma.png", "nbr": 3, "mail": "emma.berenholt@epfl.ch"},
    {"name": "Julien", "image": "julien.png", "nbr": 4, "mail": "julien.drouet@epfl.ch"},
    {"name": "Thomas", "image": "thomas.png", "nbr": 3, "mail": "thomas.chetaille@epfl.ch"},
    {"name": "Blaise", "image": "blaise.png", "nbr": 1, "mail": "blaise.depauw@epfl.ch"},
    {"name": "Prune", "image": "prune.png", "nbr": 2, "mail": "prune.ollier@epfl.ch"},
    {"name": "Elvire", "image": "elvire.png", "nbr": 3, "mail": "elvire.declermont@balelec.ch"},
    {"name": "Lila", "image": "lila.png", "nbr": 1, "mail": "lila.meflah@epfl.ch"},
    {"name": "Amaury", "image": "amaury.png", "nbr": 3, "mail": "amaury.pailloux@epfl.ch"},
    {"name": "Ainhoa", "image": "ainhoa.png", "nbr": 4, "mail": "ainhoa.vilanova@epfl.ch"},
    {"name": "Henri", "image": "henri.png", "nbr": 3, "mail": "henri.collet@epfl.ch"},
    {"name": "Fanny", "image": "fanny.png", "nbr": 1, "mail": "fanny.missillier@epfl.ch"},
    {"name": "Georges", "image": "georges.png", "nbr": 2, "mail": "georges.moussalli@epfl.ch"},
    {"name": "Theo", "image": "theo.png", "nbr": 4, "mail": "theodore.decaux@epfl.ch"},
    {"name": "Lucile", "image": "lucile.png", "nbr": 1, "mail": "lcerda@student.ethz.ch"},
    {"name": "Baptou", "image": "baptou.png", "nbr": 1, "mail": "baptiste.chatilabrunotte@epfl.ch"},
    {"name": "Paul", "image": "paul.png", "nbr": 3, "mail": "paul.gregory@epfl.ch"},
    {"name": "Youssef", "image": "youssef.png", "nbr": 3, "mail": "youssef.kacem@epfl.ch"},
    {"name": "Dalia", "image": "dalia.png", "nbr": 2, "mail": "dalia.ghosn@epfl.ch"},
    {"name": "Thea", "image": "thea.png", "nbr": 3, "mail": "thea.gluck@balelec.ch"},
    {"name": "Zac", "image": "zac.png", "nbr": 2, "mail": "zacharie.bourlard@epfl.ch"},
    {"name": "Anna", "image": "anna.png", "nbr": 4, "mail": "anna.vandermersch@balelec.ch"}
]
"""

"""

def tirageSS():
    try:
        assigned_people = people[:]
        while True:
            random.shuffle(assigned_people) 
            if all(person["name"] != assigned["name"] for person, assigned in zip(people, assigned_people)):
                break 

        # Create a dictionary of assignments
        """
        assignments = {
            person["name"]: {
                "assigned_name": assigned["name"],
                "assigned_image": assigned.get("image", ""),
                "assigned_nbr": assigned.get("nbr", ""),
                "assigned_mail": assigned.get("mail", "")
            }
            for person, assigned in zip(people, assigned_people)
        }
        """
        assignments = [
            {
                "name": person["name"],
                "email": person["mail"],
                "img": assigned.get("image", ""),
                "nbr": assigned.get("nbr", 1),
                "assigned_name": assigned["name"],
            }
            for person, assigned in zip(people, assigned_people)
        ]

        with open("assignments.json", "w") as json_file:
            json.dump(assignments, json_file, indent=4)

        print(json.dumps(assignments, indent=4))

    except json.JSONDecodeError:
        print("Error: Invalid JSON input. Please provide valid JSON data.")
    except Exception as e:
        print(f"An unexpected error has occurred: {e}")

if __name__ == "__main__":
    tirageSS()
