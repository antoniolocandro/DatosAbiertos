"use strict";

var feedModule = require("../modules/feeds.js");
var should = require('chai').should();
var database = require("../modules/database.js");
var q = require("q");

describe('Feeds', function() {

	var org1 = {
		name : "police"
	};
	var org2 = {
		name : "firemen"
	};

	var feed1 = {
		archived : false,
		name : 'test1'
	};
	var feed2 = {
		archived : false,
		name : 'test2'
	};
	var feed3 = {
		archived : true,
		name : 'test3',
		collections : [{
			_id : database.newId(),
			name : "test collection1",
			fields : []
		}]
	};

	beforeEach(function(done) {
		database.collection("orgs").then(function(c) {
			c.add(org1).then(function() {
				c.add(org2).then(function() {

					feed1.orgId = org1._id.toString();
					feed2.orgId = org2._id.toString();
					feed3.orgId = org1._id.toString();

					database.collection("feeds").then(function(coll) {
						coll.add(feed1).then(function() {
							return coll.add(feed2);
						}).then(function() {
							return coll.add(feed3);
						});
					}).done(done);
				})
			});
		});
	});

	afterEach(function(done) {
		var deleteAll = function(collectionName, callback) {
			database.currentConnection().collection(collectionName, function(err, coll) {
				coll.remove({}, callback);
			});
		}
		deleteAll("orgs", deleteAll("feeds", done));
	});

	describe('when getting a list of feeds', function() {
		it('should return a list of feeds', function(done) {
			feedModule.getAll().then(function(feeds) {
				feeds.length.should.equal(3);
			}).done(done);
		})
	});

	describe('when getting a list of feeds by org', function() {
		it('should return a list of feeds for that org', function(done) {
			feedModule.getAllByOrgId(org1._id).then(function(feeds) {
				feeds.length.should.equal(2);
			}).done(done);
		})
	});

	describe('when getting one feed by id', function() {
		it('should return the expected feed', function(done) {
			feedModule.get(feed1._id).then(function(feed) {
				feed.name.should.equal(feed1.name);
			}).done(done);
		})
	});

	describe('when archiving one feed by id', function() {
		it('should set the archive bit', function(done) {
			feedModule.archive(feed2._id).then(function(feed) {
				feed.archived.should.equal(true);
			}).done(done);
		})
	});

	describe('when creating a feed', function() {
		it('should create the feed in the database', function(done) {
			feedModule.create("New Feed", org1._id).then(function(newFeed) {
				database.collection("feeds").then(function(col) {
					col.getById(newFeed._id).then(function(feedFromDatabase) {
						feedFromDatabase.name.should.equal("New Feed");
						feedFromDatabase.orgId.should.equal(org1._id.toString());
					}).done(done);
				});
			});
		});
	});

	describe("when correcting the name of a feed", function() {
		it("should update the name in the database", function(done) {
			feedModule.correctName(feed3._id, "corrected name").then(function(modifiedFeed) {
				database.collection("feeds").then(function(col) {
					col.getById(modifiedFeed._id).then(function(feedFromDatabase) {
						feedFromDatabase.name.should.equal("corrected name");
					}).done(done);
				});
			});
		});
	});

	describe("when adding a collection to a feed", function() {
		it("should add the collection in the database", function(done) {
			feedModule.addCollection(feed2._id, "collection name").then(function(modifiedFeed) {
				database.collection("feeds").then(function(col) {
					col.getById(modifiedFeed._id).then(function(feedFromDatabase) {
						feedFromDatabase.collections[0].name.should.equal("collection name");
						feedFromDatabase.collections[0]._id.should.not.be.null;
					}).done(done);
				});
			});
		});
	});

	describe("when adding a field to a collection", function() {
		it("should add the field in the database", function(done) {
			//feed3 is the one with an existing collection
			feedModule.addField(feed3._id, feed3.collections[0]._id, "field name", "number").then(function(modifiedFeed) {
				database.collection("feeds").then(function(col) {
					col.getById(modifiedFeed._id).then(function(feedFromDatabase) {
						feedFromDatabase.collections[0].fields[0].name.should.equal("field name");
						feedFromDatabase.collections[0].fields[0].dataType.should.equal("number");
						feedFromDatabase.collections[0].fields[0]._id.should.not.be.null;
					}).done(done);
				});
			});
		});
	});

	describe("when modifying a field", function() {
		it("should change the field in the database", function(done) {
			var feedId = feed1._id;
			feedModule.addCollection(feedId, "modifying a field test").then(function(modifiedFeed) {
				var collection = modifiedFeed.collections[0];
				feedModule.addField(feedId, collection._id, "old field name").then(function(modifiedFeedWithField) {
					var field = modifiedFeedWithField.collections[0].fields[0];

					feedModule.modifyField(feedId, collection._id, field._id, "new name", "date").then(function(feedWithModifiedField) {
						var modifiedField = feedWithModifiedField.collections[0].fields[0];

						modifiedField.name.should.equal("new name");
						modifiedField.dataType.should.equal("date");

					}).done(done);
				});
			})
		});
	});

	describe("when adding a collection to a feed without a name", function() {
		var nothing;
		it("should throw an exception", function(done) {
			feedModule.addCollection(feed3._id, nothing).fail(function(err) {
				err.should.equal("Validation error! Must include name when creating a collection.");
			}).done(done);
		});
	});
})